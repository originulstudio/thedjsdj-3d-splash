import {
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { gradeFragment, gradeVertex } from "@/lib/shaders/programs";
import { disposeTarget } from "@/lib/utils/dispose";

export interface GradePass {
  render: (renderer: WebGLRenderer, drawScene: () => void) => void;
  setSize: (width: number, height: number, dpr: number) => void;
  setChroma: (amount: number) => void;
  setTime: (time: number) => void;
  dispose: () => void;
}

function targetSize(width: number, height: number, dpr: number, maxTex: number): { w: number; h: number } {
  const scale = Math.min(dpr, 1.25) * 0.75;
  let w = Math.floor(width * scale);
  let h = Math.floor(height * scale);
  const cap = Math.min(1280, maxTex);
  const long = Math.max(w, h);
  if (long > cap) {
    const k = cap / long;
    w = Math.max(2, Math.floor(w * k));
    h = Math.max(2, Math.floor(h * k));
  }
  return { w, h };
}

/** Returns null when an offscreen target cannot be allocated. Callers must render direct. */
export function createPostProcessing(
  renderer: WebGLRenderer,
  width: number,
  height: number,
  dpr: number,
): GradePass | null {
  const gl = renderer.getContext();
  let target: WebGLRenderTarget | null = null;
  try {
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxRb = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
    if (!maxTex || !maxRb || maxTex < 1024) return null;
    const size = targetSize(width, height, dpr, Math.min(maxTex, maxRb));
    target = new WebGLRenderTarget(size.w, size.h, {
      format: RGBAFormat,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.texture.colorSpace = SRGBColorSpace;
    renderer.setRenderTarget(target);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    renderer.setRenderTarget(null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      disposeTarget(target);
      return null;
    }
  } catch {
    renderer.setRenderTarget(null);
    disposeTarget(target);
    return null;
  }

  const live = target;
  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: live.texture },
      uTime: { value: 0 },
      uChroma: { value: 0 },
      uGrain: { value: 0.035 },
      uResolution: { value: new Vector2(width, height) },
    },
    vertexShader: gradeVertex,
    fragmentShader: gradeFragment,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));

  return {
    render(active, drawScene) {
      const previous = active.getRenderTarget();
      active.setRenderTarget(live);
      active.clear();
      drawScene();
      active.setRenderTarget(previous);
      active.clear();
      active.render(scene, camera);
    },
    setSize(nextWidth, nextHeight, nextDpr) {
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const size = targetSize(nextWidth, nextHeight, nextDpr, maxTex || 2048);
      live.setSize(size.w, size.h);
    },
    setChroma(amount) {
      material.uniforms.uChroma.value = amount;
    },
    setTime(time) {
      material.uniforms.uTime.value = time;
    },
    dispose() {
      material.dispose();
      disposeTarget(live);
    },
  };
}

import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
  SRGBColorSpace,
  LinearFilter,
  RGBAFormat,
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

export function createPostProcessing(width: number, height: number, dpr: number): GradePass {
  const target = new WebGLRenderTarget(Math.floor(width * dpr * 0.85), Math.floor(height * dpr * 0.85), {
    format: RGBAFormat,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    depthBuffer: true,
  });
  target.texture.colorSpace = SRGBColorSpace;

  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: target.texture },
      uTime: { value: 0 },
      uChroma: { value: 0 },
      uGrain: { value: 0.045 },
      uResolution: { value: new Vector2(width, height) },
    },
    vertexShader: gradeVertex,
    fragmentShader: gradeFragment,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));

  return {
    render(renderer, drawScene) {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.clear();
      drawScene();
      renderer.setRenderTarget(previous);
      renderer.clear();
      renderer.render(scene, camera);
    },
    setSize(nextWidth, nextHeight, nextDpr) {
      target.setSize(Math.floor(nextWidth * nextDpr * 0.85), Math.floor(nextHeight * nextDpr * 0.85));
    },
    setChroma(amount) {
      material.uniforms.uChroma.value = amount;
    },
    setTime(time) {
      material.uniforms.uTime.value = time;
    },
    dispose() {
      material.dispose();
      disposeTarget(target);
    },
  };
}

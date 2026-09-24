import {
  Color,
  FogExp2,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";

export function createRenderer(canvas: HTMLCanvasElement, maxDpr: number): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

export function createCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 0.05, 6.4);
  return camera;
}

export function createStage(): Scene {
  const scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new FogExp2(0x000000, 0.02);
  return scene;
}

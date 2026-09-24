import {
  ACESFilmicToneMapping,
  Color,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { COLOR } from "@/config/artDirection";

export function createRenderer(canvas: HTMLCanvasElement, maxDpr: number): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: maxDpr <= 1.25,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(new Color(COLOR.void), 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

export function createCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 40);
  camera.position.set(0, 0.05, 6.4);
  return camera;
}

export function createStage(): Scene {
  const scene = new Scene();
  scene.background = new Color(COLOR.voidBlue);
  return scene;
}

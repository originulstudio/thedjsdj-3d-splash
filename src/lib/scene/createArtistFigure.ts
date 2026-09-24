import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
} from "three";
import { artist } from "@/config/artist";
import { figureFragment, figureVertex, pointFragment, pointVertex } from "@/lib/shaders/programs";
import { loadImage } from "@/lib/utils/media";

export interface ArtistFigure {
  group: Group;
  material: ShaderMaterial;
  pointsMat: ShaderMaterial | null;
  texture: CanvasTexture;
}

export async function createArtistFigure(pointBudget: number): Promise<ArtistFigure> {
  const image = await loadImage(artist.portrait);
  const sample = document.createElement("canvas");
  const width = 180;
  const height = Math.round(width * (image.height / image.width));
  sample.width = width;
  sample.height = height;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const texture = new CanvasTexture(sample);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  const group = new Group();
  const aspect = image.width / image.height;
  const planeH = 2.35;
  const planeW = planeH * aspect;
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uDisp: { value: 0.02 },
      uReveal: { value: 0 },
      uSplit: { value: 0.004 },
      uGrid: { value: 0.15 },
      uOpacity: { value: 0 },
      uAudio: { value: 0 },
      uTexel: { value: new Vector2(1 / width, 1 / height) },
    },
    vertexShader: figureVertex,
    fragmentShader: figureFragment,
    transparent: true,
    depthWrite: false,
  });
  const plane = new Mesh(new PlaneGeometry(planeW, planeH, 36, 48), material);
  plane.name = "figure-plane";
  group.add(plane);

  let pointsMat: ShaderMaterial | null = null;
  if (pointBudget > 0) {
    const positions: number[] = [];
    const lums: number[] = [];
    const step = pointBudget > 2500 ? 2 : 3;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const lum = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
        if (lum < 0.16 || x > width * 0.7 || y < height * 0.08) continue;
        const nx = (x / width - 0.5) * planeW;
        const ny = (0.5 - y / height) * planeH;
        positions.push(nx, ny, (lum - 0.35) * 0.55);
        lums.push(lum);
        if (positions.length / 3 >= pointBudget) break;
      }
      if (positions.length / 3 >= pointBudget) break;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("aLum", new BufferAttribute(new Float32Array(lums), 1));
    pointsMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 1.35 },
        uReveal: { value: 0 },
      },
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      transparent: true,
      depthWrite: false,
    });
    const cloud = new Points(geometry, pointsMat);
    cloud.name = "figure-points";
    cloud.position.z = 0.05;
    group.add(cloud);
  }

  group.position.set(0.85, -0.05, -0.4);
  return { group, material, pointsMat, texture };
}

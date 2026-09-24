import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DynamicDrawUsage,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { hash } from "@/lib/utils/math";
import { particleFragment, particleVertex } from "@/lib/shaders/programs";

export interface ParticleField {
  group: Group;
  update: (time: number, hold: boolean, px: number, py: number, audio: number, reduced: boolean) => void;
}

function glowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("glow texture missing");
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.4, "rgba(255,255,255,0.45)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const GLOW = glowTexture();

function makePoints(count: number, radius: number, color: string, alpha: number, size: number): {
  points: Points;
  base: Float32Array;
  velocity: Float32Array;
} {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const base = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const theta = hash(i + 1.2) * Math.PI * 2;
    const phi = Math.acos(2 * hash(i + 4.4) - 1);
    const r = radius * (0.45 + hash(i + 8.8) * 1.1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = (hash(i + 2.2) - 0.5) * radius * 0.9;
    const z = r * Math.cos(phi) * 0.85 - radius * 0.15;
    positions.set([x, y, z], i * 3);
    base.set([x, y, z], i * 3);
    scales[i] = 0.25 + hash(i + 6.6) * 1.1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute("aScale", new BufferAttribute(scales, 1));
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uColor: { value: new Vector3() },
      uAlpha: { value: alpha },
      uMap: { value: GLOW },
    },
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const colorVec = material.uniforms.uColor.value as Vector3;
  colorVec.set(
    parseInt(color.slice(1, 3), 16) / 255,
    parseInt(color.slice(3, 5), 16) / 255,
    parseInt(color.slice(5, 7), 16) / 255,
  );
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return { points, base, velocity };
}

export function createStarfield(stars: number, dust: number, signal: number): ParticleField {
  const group = new Group();
  const layers = [
    makePoints(stars, 11, "#ffffff", 0.72, 1.15),
    makePoints(dust, 5.2, "#ff3333", 0.42, 1.7),
    makePoints(signal, 3.1, "#c9ff3b", 0.28, 1.35),
  ];
  for (const layer of layers) group.add(layer.points);
  const target = new Vector3();

  return {
    group,
    update(time, hold, px, py, audio, reduced) {
      if (!reduced) group.rotation.y = time * 0.012 + px * 0.08;
      group.rotation.x = reduced ? 0 : py * 0.05;
      target.set(px * 1.2, py * 0.7, 0);
      layers.forEach((layer, index) => {
        const material = layer.points.material as ShaderMaterial;
        material.uniforms.uTime.value = time;
        material.uniforms.uSize.value = (index === 0 ? 1.05 : 1.45) * (1 + audio * 0.35);
        if (reduced || index === 0) return;
        const attr = layer.points.geometry.getAttribute("position") as BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = layer.base[i] ?? 0;
          const by = layer.base[i + 1] ?? 0;
          const bz = layer.base[i + 2] ?? 0;
          let x = arr[i] ?? bx;
          let y = arr[i + 1] ?? by;
          let z = arr[i + 2] ?? bz;
          if (hold) {
            layer.velocity[i] = (layer.velocity[i] ?? 0) + (target.x - x) * 0.003;
            layer.velocity[i + 1] = (layer.velocity[i + 1] ?? 0) + (target.y - y) * 0.003;
          }
          layer.velocity[i] = ((layer.velocity[i] ?? 0) + (bx - x) * 0.012) * 0.92;
          layer.velocity[i + 1] = ((layer.velocity[i + 1] ?? 0) + (by - y) * 0.012) * 0.92;
          layer.velocity[i + 2] = ((layer.velocity[i + 2] ?? 0) + (bz - z) * 0.012) * 0.92;
          arr[i] = x + (layer.velocity[i] ?? 0);
          arr[i + 1] = y + (layer.velocity[i + 1] ?? 0);
          arr[i + 2] = z + (layer.velocity[i + 2] ?? 0);
        }
        attr.needsUpdate = true;
      });
    },
  };
}

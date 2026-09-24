import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { COLOR } from "@/config/artDirection";
import { hash } from "@/lib/utils/math";
import { particleFragment, particleVertex } from "@/lib/shaders/programs";

export interface ParticleField {
  group: Group;
  update: (time: number, hold: boolean, px: number, py: number, audio: number, reduced: boolean) => void;
}

function makePoints(count: number, radius: number, color: string, alpha: number, size: number): {
  points: Points;
  base: Float32Array;
  velocity: Float32Array;
} {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const base = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const scratch = new Vector3();
  for (let i = 0; i < count; i += 1) {
    const theta = hash(i + 1.2) * Math.PI * 2;
    const phi = Math.acos(2 * hash(i + 4.4) - 1);
    const r = radius * (0.35 + hash(i + 8.8) * 0.9);
    scratch.set(
      r * Math.sin(phi) * Math.cos(theta),
      (hash(i + 2.2) - 0.5) * radius * 0.85,
      r * Math.cos(phi) * 0.65 - radius * 0.2,
    );
    positions.set([scratch.x, scratch.y, scratch.z], i * 3);
    base.set([scratch.x, scratch.y, scratch.z], i * 3);
    scales[i] = 0.35 + hash(i + 6.6) * 1.4;
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
    },
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const colorVec = material.uniforms.uColor.value as Vector3;
  const hex = new Vector3(
    parseInt(color.slice(1, 3), 16) / 255,
    parseInt(color.slice(3, 5), 16) / 255,
    parseInt(color.slice(5, 7), 16) / 255,
  );
  colorVec.copy(hex);
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return { points, base, velocity };
}

export function createStarfield(stars: number, dust: number, signal: number): ParticleField {
  const group = new Group();
  const layers = [
    makePoints(stars, 9.5, COLOR.silver, 0.55, 1.1),
    makePoints(dust, 4.2, COLOR.ion, 0.28, 1.6),
    makePoints(signal, 2.4, COLOR.ember, 0.4, 2.1),
  ];
  for (const layer of layers) group.add(layer.points);

  const target = new Vector3();

  return {
    group,
    update(time, hold, px, py, audio, reduced) {
      target.set(px * 1.4, py * 0.8, 0.2);
      layers.forEach((layer, index) => {
        const material = layer.points.material as ShaderMaterial;
        material.uniforms.uTime.value = time;
        material.uniforms.uSize.value = (index === 0 ? 1.1 : index === 1 ? 1.5 : 2) * (1 + audio * 0.8);
        if (reduced) return;
        const attr = layer.points.geometry.getAttribute("position") as BufferAttribute;
        const arr = attr.array as Float32Array;
        const drift = index === 0 ? 0.015 : 0.05;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = layer.base[i];
          const by = layer.base[i + 1];
          const bz = layer.base[i + 2];
          let x = arr[i];
          let y = arr[i + 1];
          let z = arr[i + 2];
          x += Math.sin(time * drift + by) * 0.002;
          y += Math.cos(time * drift * 0.8 + bx) * 0.0015;
          if (hold && index > 0) {
            layer.velocity[i] += (target.x - x) * 0.004;
            layer.velocity[i + 1] += (target.y - y) * 0.004;
            layer.velocity[i + 2] += (target.z - z) * 0.002;
          }
          layer.velocity[i] += (bx - x) * 0.01;
          layer.velocity[i + 1] += (by - y) * 0.01;
          layer.velocity[i + 2] += (bz - z) * 0.01;
          layer.velocity[i] *= 0.92;
          layer.velocity[i + 1] *= 0.92;
          layer.velocity[i + 2] *= 0.92;
          arr[i] = x + layer.velocity[i];
          arr[i + 1] = y + layer.velocity[i + 1];
          arr[i + 2] = z + layer.velocity[i + 2];
        }
        attr.needsUpdate = true;
      });
    },
  };
}

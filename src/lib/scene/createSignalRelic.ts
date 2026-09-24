import {
  CanvasTexture,
  Color,
  EquirectangularReflectionMapping,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoColorSpace,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { COLOR } from "@/config/artDirection";
import { hash } from "@/lib/utils/math";
import { shardFragment, shardVertex } from "@/lib/shaders/programs";
import { ShaderMaterial } from "three";

export interface SignalRelic {
  group: Group;
  physical: MeshPhysicalMaterial;
  shardMat: ShaderMaterial | null;
  home: InstancedMesh | null;
}

function facetNormal(size = 512): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("normal map context missing");
  const image = ctx.createImageData(size, size);
  const tiles = 22;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tx = Math.floor((x / size) * tiles);
      const ty = Math.floor((y / size) * tiles);
      const nx = (hash(tx * 13.1 + ty) - 0.5) * 0.85;
      const ny = (hash(ty * 9.7 + tx) - 0.5) * 0.85;
      const nz = Math.sqrt(Math.max(0.08, 1 - nx * nx - ny * ny));
      const i = (y * size + x) * 4;
      image.data[i] = (nx * 0.5 + 0.5) * 255;
      image.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      image.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function neonEnvironment(renderer: WebGLRenderer) {
  const room = new Scene();
  const shell = new Mesh(
    new SphereGeometry(12, 24, 16),
    new MeshBasicMaterial({ color: 0x000000, side: 1 }),
  );
  room.add(shell);
  const panels: Array<[number, number, number, number]> = [
    [0xff3333, 6, 1.2, 0],
    [0x4cc9ff, -5, -0.4, 3],
    [0xc9ff3b, 1, 2.4, -6],
    [0xffffff, -2, -2, -5],
    [0xff4d2e, 4, -1.6, 4],
  ];
  for (const [hex, x, y, z] of panels) {
    const panel = new Mesh(new PlaneGeometry(3.2, 1.4), new MeshBasicMaterial({ color: hex }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.04);
  pmrem.dispose();
  target.texture.mapping = EquirectangularReflectionMapping;
  return target.texture;
}

export function createSignalRelic(renderer: WebGLRenderer, segments: number, shards: number): SignalRelic {
  const group = new Group();
  const env = neonEnvironment(renderer);
  const physical = new MeshPhysicalMaterial({
    color: new Color("#07080c"),
    metalness: 1,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMap: env,
    envMapIntensity: 1.85,
    normalMap: facetNormal(),
    normalScale: new Vector2(0.65, 0.65),
  });
  const core = new Mesh(new SphereGeometry(1, segments, segments), physical);
  core.name = "relic-core";
  group.add(core);

  const ringMat = new MeshPhysicalMaterial({
    color: new Color("#d9dee7"),
    metalness: 1,
    roughness: 0.15,
    clearcoat: 1,
    envMap: env,
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 0.55,
  });
  [1.55, 1.92].forEach((radius, i) => {
    const ring = new Mesh(new TorusGeometry(radius, 0.0045, 12, 180), ringMat);
    ring.rotation.set(i === 0 ? 1.15 : 0.45, 0.25, i === 0 ? 0.35 : 1.05);
    group.add(ring);
  });

  let home: InstancedMesh | null = null;
  let shardMat: ShaderMaterial | null = null;
  const count = Math.min(shards, 18);
  if (count > 0) {
    shardMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCharge: { value: 0 },
        uEmber: { value: new Color("#ff3333") },
        uSilver: { value: new Color(COLOR.silver) },
        uLime: { value: new Color(COLOR.lime) },
      },
      vertexShader: shardVertex,
      fragmentShader: shardFragment,
      transparent: true,
      depthWrite: false,
    });
    const geo = new PlaneGeometry(0.14, 0.18);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) seeds[i] = hash(i + 3);
    geo.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    home = new InstancedMesh(geo, shardMat, count);
    const dummy = new Object3D();
    const normal = new Vector3();
    const up = new Vector3(0, 0, 1);
    for (let i = 0; i < count; i += 1) {
      const theta = hash(i + 1) * Math.PI * 2;
      const phi = Math.acos(2 * hash(i + 9) - 1);
      normal.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi) * 0.65, Math.sin(phi) * Math.sin(theta));
      dummy.position.copy(normal).multiplyScalar(1.28 + hash(i + 2) * 0.35);
      dummy.quaternion.setFromUnitVectors(up, normal.clone().normalize());
      dummy.scale.setScalar(0.45 + hash(i + 4) * 0.7);
      dummy.updateMatrix();
      home.setMatrixAt(i, dummy.matrix);
    }
    home.instanceMatrix.needsUpdate = true;
    group.add(home);
  }

  group.rotation.z = MathUtils.degToRad(-8);
  return { group, physical, shardMat, home };
}

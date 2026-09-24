import {
  Color,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Mesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import { COLOR } from "@/config/artDirection";
import { hash } from "@/lib/utils/math";
import { relicFragment, relicVertex, shardFragment, shardVertex } from "@/lib/shaders/programs";

export interface SignalRelic {
  group: Group;
  coreMat: ShaderMaterial;
  shardMat: ShaderMaterial | null;
  ringMat: ShaderMaterial | null;
  home: InstancedMesh | null;
}

function makeShader(vertex: string, fragment: string, transparent = false): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uAudio: { value: 0 },
      uCharge: { value: 0 },
      uEmber: { value: new Color(COLOR.ember) },
      uIon: { value: new Color(COLOR.ion) },
      uSilver: { value: new Color(COLOR.silver) },
      uLime: { value: new Color(COLOR.lime) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent,
  });
}

export function createSignalRelic(detail: number, shards: number): SignalRelic {
  const group = new Group();
  const coreMat = makeShader(relicVertex, relicFragment);
  const core = new Mesh(new IcosahedronGeometry(1, detail), coreMat);
  core.name = "relic-core";
  group.add(core);

  const ringMat = makeShader(relicVertex, relicFragment, true);
  ringMat.depthWrite = false;
  const ringScales = [1.42, 1.7, 2.05];
  const ringTilts: Array<[number, number, number]> = [
    [1.15, 0.2, 0.4],
    [0.4, 1.2, 0.15],
    [0.8, 0.5, 1.1],
  ];
  ringTilts.forEach((tilt, i) => {
    const ring = new Mesh(new TorusGeometry(ringScales[i], 0.006, 8, 96), ringMat);
    ring.rotation.set(tilt[0], tilt[1], tilt[2]);
    ring.name = "relic-ring";
    group.add(ring);
  });

  let home: InstancedMesh | null = null;
  let shardMat: ShaderMaterial | null = null;
  if (shards > 0) {
    shardMat = makeShader(shardVertex, shardFragment, true);
    const geo = new PlaneGeometry(0.16, 0.22);
    const seeds = new Float32Array(shards);
    for (let i = 0; i < shards; i += 1) seeds[i] = hash(i + 3);
    geo.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    home = new InstancedMesh(geo, shardMat, shards);
    const dummy = new Object3D();
    const normal = new Vector3();
    const up = new Vector3(0, 0, 1);
    for (let i = 0; i < shards; i += 1) {
      const u = hash(i + 1);
      const v = hash(i + 9);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      normal.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      const gap = hash(i + 5) > 0.18 ? 1 : 0;
      dummy.position.copy(normal).multiplyScalar(1.045);
      dummy.quaternion.setFromUnitVectors(up, normal);
      dummy.rotateZ(hash(i + 4) * Math.PI);
      dummy.scale.setScalar(gap * (0.32 + hash(i + 7) * 0.45));
      dummy.updateMatrix();
      home.setMatrixAt(i, dummy.matrix);
    }
    home.instanceMatrix.needsUpdate = true;
    home.name = "relic-shards";
    group.add(home);
  }

  group.rotation.z = MathUtils.degToRad(-8);
  return { group, coreMat, shardMat, ringMat, home };
}

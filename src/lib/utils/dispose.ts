import type { BufferGeometry, Material, Object3D, Texture, WebGLRenderTarget } from "three";

interface UniformValue {
  value: unknown;
}

export function disposeMaterial(material: Material | Material[]): void {
  const list = Array.isArray(material) ? material : [material];
  for (const entry of list) {
    const record = entry as Material & { map?: Texture | null; uniforms?: Record<string, UniformValue> };
    record.map?.dispose();
    if (record.uniforms) {
      for (const uniform of Object.values(record.uniforms)) {
        const value = uniform.value as { isTexture?: boolean; dispose?: () => void } | null;
        if (value && value.isTexture && value.dispose) value.dispose();
      }
    }
    entry.dispose();
  }
}

export function disposeObject(root: Object3D): void {
  root.traverse((obj: Object3D) => {
    const mesh = obj as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    mesh.geometry?.dispose();
    if (mesh.material) disposeMaterial(mesh.material);
  });
}

export function disposeTarget(target: WebGLRenderTarget | null): void {
  target?.dispose();
}

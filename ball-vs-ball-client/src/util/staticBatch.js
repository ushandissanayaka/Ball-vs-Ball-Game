import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Static batching: meshes under `root` that never move and share a material (and shadow flags) are merged
 * into one mesh each, so the lobby's hundreds of parts cost a few dozen draw calls. The picture is unchanged.
 * Left alone: transparent and multi-material meshes, instanced meshes, sprites, and meshes marked
 * `userData.dynamic` (their owner changes them later). Call once the subtree is fully built.
 */
export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const buckets = new Map();
  const skipped = new Set();
  root.traverse((object) => {
    if (object.userData.dynamic) object.traverse((child) => skipped.add(child));
  });

  root.traverse((mesh) => {
    if (!mesh.isMesh || mesh.isInstancedMesh || skipped.has(mesh) || Array.isArray(mesh.material)) return;
    if (mesh.material.transparent || !mesh.visible) return;
    const key = [mesh.material.uuid, mesh.castShadow, mesh.receiveShadow, Object.keys(mesh.geometry.attributes).sort().join()].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mesh);
  });

  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld));
      return geometry;
    });
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    const batch = new THREE.Mesh(merged, meshes[0].material);
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    root.add(batch);
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
  }
}

import * as THREE from 'three';
import { NEON, PROP } from '../../config/palette.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box } from '../../util/mesh.js';

/** Hexagonal glass plinth with a glowing hex rim (the stands between the leaderboards; left empty for now). */
export function createHexPedestal() {
  const group = new THREE.Group();
  group.name = 'hex-pedestal';
  addMesh(group, new THREE.CylinderGeometry(4.6, 4.9, 1.3, 6), standard('#3d6fb8', { roughness: 0.12, metalness: 0.3 }), {
    position: [0, 0.65, 0],
  });
  // A torus with six tube segments is a hexagon.
  addMesh(group, new THREE.TorusGeometry(4.6, 0.2, 4, 6), glow(NEON.cyan, 1.8), {
    position: [0, 1.32, 0], rotation: [-Math.PI / 2, 0, 0], cast: false,
  });
  return group;
}

/** The small dark square stand in front of the hub's runway exit, with a light frame on top. */
export function createInfoPedestal() {
  const group = new THREE.Group();
  group.name = 'info-pedestal';
  block(group, [6.5, 2.6, 6.5], standard(PROP.plinth, { roughness: 0.5 }));
  const frame = standard('#d9e2f2', { roughness: 0.4 });
  for (const [w, d, x, z] of [[5.4, 0.45, 0, -2.5], [5.4, 0.45, 0, 2.5], [0.45, 5.4, -2.5, 0], [0.45, 5.4, 2.5, 0]]) {
    box(group, [w, 0.2, d], frame, { position: [x, 2.7, z] });
  }
  return group;
}

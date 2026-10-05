import * as THREE from 'three';
import { NEON } from '../../config/palette.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh } from '../../util/mesh.js';

/** Hexagonal glass plinth with a glowing hex rim (the stands between the leaderboards, where the dancers stand). */
export const PEDESTAL_TOP = 2.2;
export function createHexPedestal() {
  const group = new THREE.Group();
  group.name = 'hex-pedestal';
  addMesh(group, new THREE.CylinderGeometry(6.4, 6.8, 2.2, 6), standard('#3d6fb8', { roughness: 0.12, metalness: 0.3 }), {
    position: [0, 1.1, 0],
  });
  // A torus with six tube segments is a hexagon.
  addMesh(group, new THREE.TorusGeometry(6.4, 0.26, 4, 6), glow(NEON.cyan, 1.8), {
    position: [0, 2.22, 0], rotation: [-Math.PI / 2, 0, 0], cast: false,
  });
  return group;
}

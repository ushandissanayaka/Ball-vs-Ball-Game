import * as THREE from 'three';
import { LABEL, NEON, PROP } from '../../config/palette.js';
import { additive, dotTexture, fadeTexture } from '../../effects/glowTextures.js';
import { createLabel, stationLines } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box } from '../../util/mesh.js';

/**
 * The 2V2 queue booth: a round glowing pad, a glass booth between two dark pillars, a bright orb inside and a
 * column of light rising from the pad.
 */
export function createPortal2v2() {
  const group = new THREE.Group();
  group.name = 'portal-2v2';
  const dark = standard(PROP.pillar, { roughness: 0.4, metalness: 0.3 });

  addMesh(group, new THREE.CylinderGeometry(7.6, 8, 0.9, 48), standard('#26365f', { roughness: 0.35, metalness: 0.2 }), { position: [0, 0.45, 0] });
  addMesh(group, new THREE.TorusGeometry(6.9, 0.32, 8, 64), glow(NEON.cyan, 1.8), { position: [0, 0.95, 0], rotation: [-Math.PI / 2, 0, 0], cast: false });
  addMesh(group, new THREE.CylinderGeometry(5.6, 5.6, 0.2, 48), glow('#c4f5ff', 1.5), { position: [0, 1, 0], cast: false });

  for (const x of [-6.4, 6.4]) block(group, [1.7, 17.5, 2], dark, { position: [x, 0.9, -0.5] });
  block(group, [14.5, 1.6, 2.4], dark, { position: [0, 18.2, -0.5] });
  block(group, [11, 0.6, 7], dark, { position: [0, 17.6, -0.5] });
  // Bright edges down the front of the glass.
  for (const x of [-5.4, 5.4]) box(group, [0.35, 16.4, 0.35], glow(NEON.white, 1.4), { position: [x, 9.4, 2.9], cast: false });

  const glass = new THREE.MeshStandardMaterial({
    color: '#9fe4ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.6,
  });
  addMesh(group, new THREE.BoxGeometry(11, 16.6, 7), glass, { position: [0, 9.6, -0.5], cast: false, receive: false }).renderOrder = 1;

  // Light column: bright at the pad, fading upward.
  const column = new THREE.CylinderGeometry(4.6, 5.2, 15, 32, 1, true);
  column.rotateX(Math.PI); // fade texture is brightest at the top; flip it so it is brightest at the bottom
  addMesh(group, column, additive(fadeTexture(), NEON.cyan, 0.55), { position: [0, 8.5, -0.5], cast: false, receive: false }).renderOrder = 2;

  addMesh(group, new THREE.SphereGeometry(2.3, 24, 16), glow('#eafcff', 1.9), { position: [0, 4.2, 0.2], cast: false });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: NEON.cyan, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.setScalar(13);
  halo.position.set(0, 4.2, 0.2);
  group.add(halo);

  const label = createLabel(stationLines('2V2', LABEL.station), { worldHeight: 6 });
  label.position.set(0, 23.5, 0);
  group.add(label);
  return group;
}

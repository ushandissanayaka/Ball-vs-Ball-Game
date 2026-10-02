import * as THREE from 'three';
import { BALL_COLORS, LABEL, NEON, PROP } from '../../config/palette.js';
import { createLabel, stationLines } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { mulberry32 } from '../../util/random.js';
import { addMesh, block, box } from '../../util/mesh.js';

const GLASS_BOTTOM = 7.2;
const GLASS_H = 7;

/** A pile of balls filling the bottom of a glass case, as one instanced mesh. */
function ballPile(seed) {
  const rand = mulberry32(seed);
  const spots = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const offset = layer % 2 ? 1 : 0;
    for (let ix = 0; ix < 4 - offset; ix += 1) {
      for (let iz = 0; iz < 3 - offset; iz += 1) {
        if (layer === 2 && rand() < 0.35) continue; // an uneven top
        spots.push([-3 + offset + ix * 2, GLASS_BOTTOM + 1.05 + layer * 1.75, -2 + offset + iz * 2]);
      }
    }
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1.02, 18, 12),
    standard('#ffffff', { roughness: 0.28, metalness: 0.05 }),
    spots.length,
  );
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  spots.forEach(([x, y, z], index) => {
    dummy.position.set(x + (rand() - 0.5) * 0.4, y + (rand() - 0.5) * 0.3, z + (rand() - 0.5) * 0.4);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, color.set(BALL_COLORS[Math.floor(rand() * BALL_COLORS.length)]));
  });
  mesh.castShadow = true;
  return mesh;
}

/** One gacha machine: coloured cabinet with a dispenser, glass case full of balls, lid. */
function machine({ body, trim, seed }) {
  const group = new THREE.Group();
  const bodyMat = standard(body, { roughness: 0.35, metalness: 0.15 });
  const trimMat = standard(trim, { roughness: 0.4, metalness: 0.2 });
  block(group, [9.4, 1, 7.4], trimMat, { position: [0, 0, 0] });
  block(group, [9, 6.2, 7], bodyMat, { position: [0, 1, 0] });
  box(group, [3.6, 2.2, 0.4], standard('#14171f', { roughness: 0.6 }), { position: [0, 3, 3.55] });
  box(group, [1.4, 1.4, 0.5], trimMat, { position: [2.8, 5.2, 3.55] });
  // Corner posts of the glass case, then the lid.
  for (const [x, z] of [[-4.3, -3.3], [4.3, -3.3], [-4.3, 3.3], [4.3, 3.3]]) {
    block(group, [0.45, GLASS_H, 0.45], bodyMat, { position: [x, GLASS_BOTTOM, z] });
  }
  block(group, [9.4, 1, 7.4], bodyMat, { position: [0, GLASS_BOTTOM + GLASS_H, 0] });
  block(group, [8.6, 0.4, 6.6], trimMat, { position: [0, GLASS_BOTTOM + GLASS_H + 1, 0] });

  group.add(ballPile(seed));
  const glass = new THREE.MeshStandardMaterial({
    color: '#d8f1ff', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.8,
  });
  addMesh(group, new THREE.BoxGeometry(8.6, GLASS_H, 6.6), glass, { position: [0, GLASS_BOTTOM + GLASS_H / 2, 0], cast: false, receive: false }).renderOrder = 1;
  return group;
}

/** "Balls": two gacha machines on a neon-edged plinth — coins on the dark one, diamonds on the red one. */
export function createBallsMachine() {
  const group = new THREE.Group();
  group.name = 'balls-machine';
  block(group, [24, 1.3, 12.5], standard(PROP.plinth, { roughness: 0.5 }));
  box(group, [24.2, 0.35, 0.35], glow(NEON.cyan, 1.6), { position: [0, 0.25, 6.3], cast: false });
  box(group, [11, 0.35, 0.35], glow(NEON.red, 1.6), { position: [5.6, 0.7, 6.32], cast: false });

  const left = machine({ body: PROP.machineDark, trim: PROP.machineDarkTrim, seed: 21 });
  left.position.set(-5.4, 1.3, 0);
  const right = machine({ body: PROP.machineRed, trim: PROP.machineRedTrim, seed: 42 });
  right.position.set(5.4, 1.3, 0);
  group.add(left, right);

  const top = 1.3 + GLASS_BOTTOM + GLASS_H + 1.4;
  addMesh(group, new THREE.CylinderGeometry(2, 2, 0.55, 32), standard(PROP.gold, { roughness: 0.25, metalness: 0.85 }), {
    position: [-5.4, top + 2.4, 0], rotation: [Math.PI / 2, 0, 0],
  });
  const gem = standard(PROP.diamond, { roughness: 0.08, metalness: 0.3, emissive: '#1b6fd6', emissiveIntensity: 0.35 });
  addMesh(group, new THREE.CylinderGeometry(2.3, 0, 2.6, 6), gem, { position: [5.4, top + 1.9, 0] });
  addMesh(group, new THREE.CylinderGeometry(1.5, 2.3, 0.9, 6), gem, { position: [5.4, top + 3.65, 0] });

  const label = createLabel(stationLines('Balls', LABEL.station), { worldHeight: 5.5 });
  label.position.set(0, top + 7.5, 0);
  group.add(label);
  return group;
}

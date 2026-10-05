import * as THREE from 'three';
import { NEON } from '../../config/palette.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh } from '../../util/mesh.js';
import { puffTexture } from '../../effects/smokeParticles.js';
import { createLegionPuppet } from '../player/LegionCharacter.js';
import { batchStatic } from '../../util/staticBatch.js';

// A big black cruiser bike ridden by Bloxity's own Legion avatar (full kit and shoes), after the reference shots. Built facing +x with its origin where the rear tyre touches the
// ground, so turning the group about z pops a wheelie round the rear wheel, as a real one does. It moves, so it
// casts no shadow (the shadow map is drawn once); the showcase lays a soft shadow under it instead.

export const WHEEL_RADIUS = 1.75;
export const WHEELBASE = 6.8;

const COLORS = {
  body: '#121318',
  frame: '#1d1f25',
  rubber: '#17181c',
  hub: '#a9b1bc',
  hubDark: '#5c6470',
  chrome: '#8d95a1',
  engine: '#3a3f4a',
};

const mat = {
  body: () => standard(COLORS.body, { roughness: 0.25, metalness: 0.5 }),
  frame: () => standard(COLORS.frame, { roughness: 0.45, metalness: 0.4 }),
  rubber: () => standard(COLORS.rubber, { roughness: 0.9 }),
  chrome: () => standard(COLORS.chrome, { roughness: 0.2, metalness: 0.9 }),
};

/** No shadow casting on anything here (see above). */
const part = (parent, geometry, material, options = {}) => addMesh(parent, geometry, material, { cast: false, ...options });
const boxPart = (parent, size, material, options) => part(parent, new THREE.BoxGeometry(...size), material, options);

/** A bar (box) running from point a to point b, in the xy plane at depth z. */
function bar(parent, [ax, ay], [bx, by], z, thickness, material) {
  const length = Math.hypot(bx - ax, by - ay);
  return boxPart(parent, [length, thickness, thickness], material, {
    position: [(ax + bx) / 2, (ay + by) / 2, z], rotation: [0, 0, Math.atan2(by - ay, bx - ax)],
  });
}

/** A wheel group (spins about z): tyre, hub, and the glowing red ring round the tyre. */
function wheel() {
  const group = new THREE.Group();
  const r = WHEEL_RADIUS;
  part(group, new THREE.TorusGeometry(r - 0.4, 0.4, 12, 36), mat.rubber());
  const hub = new THREE.CylinderGeometry(r - 0.85, r - 0.85, 0.55, 28);
  hub.rotateX(Math.PI / 2);
  part(group, hub, standard(COLORS.hub, { roughness: 0.3, metalness: 0.7 }));
  const cap = new THREE.CylinderGeometry(0.42, 0.42, 0.75, 16);
  cap.rotateX(Math.PI / 2);
  part(group, cap, standard(COLORS.hubDark, { roughness: 0.4, metalness: 0.6 }));
  // Spoke ring: a few darker bars across the hub, so the spin shows.
  for (let i = 0; i < 3; i += 1) {
    boxPart(group, [(r - 0.9) * 2, 0.16, 0.6], standard(COLORS.hubDark, { roughness: 0.4, metalness: 0.6 }), { rotation: [0, 0, (i * Math.PI) / 3] });
  }
  part(group, new THREE.TorusGeometry(r + 0.04, 0.1, 6, 48), glow(NEON.red, 2.3));
  // Dashes on the glowing ring, like the reference's segmented rim light.
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    boxPart(group, [0.18, 0.5, 0.22], glow('#ffd0d8', 2), {
      position: [Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05), 0], rotation: [0, 0, a],
    });
  }
  // Red flame and black smoke puffs round the tyre: they turn with the wheel, so the fire seems to roll.
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const dark = i % 4 === 3;
    const flame = new THREE.Sprite(dark ? DARK_PUFF() : FLAME_PUFF());
    flame.position.set(Math.cos(a) * (r + 0.3), Math.sin(a) * (r + 0.3), 0);
    flame.scale.setScalar(dark ? 1.6 : 1.3 + (i % 3) * 0.3);
    group.add(flame);
  }
  return group;
}

let puff = null;
const puffMaterial = (color, opacity) => () => {
  puff ??= puffTexture();
  return new THREE.SpriteMaterial({ map: puff, color, opacity, transparent: true, depthWrite: false, toneMapped: false });
};
const FLAME_PUFF = puffMaterial('#ff2a3f', 0.95);
const DARK_PUFF = puffMaterial('#14060a', 0.85);


/**
 * The rider: Bloxity's own Legion avatar (as the players and the dancers), seated: hips on the seat, thighs
 * forward, shins down to the pegs, leaning in with the hands on the bars.
 */
function legionRider() {
  const puppet = createLegionPuppet('0');
  const seat = new THREE.Group();
  seat.position.set(1.55, 1.75, 0); // its hips (2.4 up in the model, x0.95) land on the seat
  seat.rotation.y = Math.PI / 2; // the model faces +z; the bike faces +x
  seat.scale.setScalar(0.95);
  seat.add(puppet.group);
  puppet.ready.then(() => {
    puppet.pose('LegL1', -1.45);
    puppet.pose('LegR1', -1.45);
    puppet.pose('LegL2', 1.25);
    puppet.pose('LegR2', 1.25);
    puppet.pose('Spine1', -0.3);
    puppet.pose('ArmL1', -1.15, 0.12);
    puppet.pose('ArmR1', -1.15, -0.12);
    puppet.pose('ArmL2', -0.35);
    puppet.pose('ArmR2', -0.35);
    puppet.pose('Neck1', 0.25);
  });
  return seat;
}

/**
 * The bike and rider. Returns { group, rear, front }: turn `group.rotation.z` for wheelies, and spin the two
 * wheels with `rotation.z` (negative rolls forward).
 */
export function createBikeRider() {
  const group = new THREE.Group();
  group.name = 'bike-rider';
  const r = WHEEL_RADIUS;
  const rear = wheel();
  rear.position.set(0, r, 0);
  const front = wheel();
  front.position.set(WHEELBASE, r, 0);
  group.add(rear, front);

  const frame = mat.frame();
  const chrome = mat.chrome();
  for (const z of [-0.5, 0.5]) bar(group, [0, r], [2.4, 2.5], z, 0.3, frame); // swingarm
  bar(group, [5.3, 4.5], [3.6, 1.9], 0, 0.45, frame); // down tube
  bar(group, [1.0, 3.6], [5.2, 4.6], 0, 0.4, frame); // backbone
  boxPart(group, [2.4, 1.7, 1.3], standard(COLORS.engine, { roughness: 0.35, metalness: 0.7 }), { position: [3.0, 2.4, 0] });
  for (const [x, lean] of [[2.5, 0.35], [3.5, -0.35]]) {
    part(group, new THREE.CylinderGeometry(0.45, 0.5, 1.4, 12), chrome, { position: [x, 3.45, 0], rotation: [0, 0, lean] });
  }
  // Tank, seat and fenders.
  boxPart(group, [2.7, 1.15, 1.35], mat.body(), { position: [4.0, 4.3, 0], rotation: [0, 0, -0.12] });
  boxPart(group, [2.7, 0.5, 1.3], standard('#1b1c21', { roughness: 0.85 }), { position: [1.6, 3.85, 0] });
  boxPart(group, [0.6, 0.8, 1.3], standard('#1b1c21', { roughness: 0.85 }), { position: [0.35, 4.25, 0] });
  boxPart(group, [2.6, 0.22, 0.95], mat.body(), { position: [-0.1, 3.75, 0], rotation: [0, 0, 0.18] });
  boxPart(group, [2.2, 0.22, 0.9], mat.body(), { position: [WHEELBASE - 0.1, r * 2 + 0.25, 0], rotation: [0, 0, -0.15] });
  // Front fork, headlight, handlebars.
  for (const z of [-0.6, 0.6]) bar(group, [WHEELBASE, r], [5.55, 5.0], z, 0.3, chrome);
  const lamp = new THREE.CylinderGeometry(0.5, 0.42, 0.45, 16);
  lamp.rotateZ(Math.PI / 2);
  part(group, lamp, chrome, { position: [6.0, 4.55, 0] });
  const lens = new THREE.CircleGeometry(0.4, 16);
  lens.rotateY(Math.PI / 2);
  part(group, lens, glow('#fff4dc', 1.8), { position: [6.24, 4.55, 0] });
  boxPart(group, [0.28, 0.28, 3.0], standard('#15161b', { roughness: 0.5, metalness: 0.5 }), { position: [5.45, 5.3, 0] });
  for (const z of [-0.5, 0.5]) bar(group, [5.5, 4.9], [5.45, 5.3], z, 0.22, chrome);
  // Exhaust down the right side.
  const pipe = new THREE.CylinderGeometry(0.3, 0.3, 4.6, 12);
  pipe.rotateZ(Math.PI / 2 - 0.12);
  part(group, pipe, chrome, { position: [1.3, 2.05, 0.85] });
  const tip = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 12);
  tip.rotateZ(Math.PI / 2 - 0.12);
  part(group, tip, standard('#2a2c32', { roughness: 0.6 }), { position: [-1.0, 2.3, 0.85] });

  // Merge the parts that never move against each other into one mesh per material (the same picture in a
  // handful of draws instead of dozens): the frame and body, and each wheel on its own (they spin).
  for (const spinning of [rear, front]) {
    batchStatic(spinning);
    spinning.userData.dynamic = true;
  }
  batchStatic(group);
  for (const spinning of [rear, front]) spinning.userData.dynamic = false;
  group.add(legionRider());
  return { group, rear, front };
}

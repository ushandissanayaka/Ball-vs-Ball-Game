import * as THREE from 'three';
import { NEON } from '../../config/palette.js';
import { canvasTexture } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh } from '../../util/mesh.js';
import { puffTexture } from '../../effects/smokeParticles.js';

// A big black cruiser bike with a blocky Bloxity rider in full kit (orange hair, black jacket, camo trousers,
// white trainers), after the reference shots. Built facing +x with its origin where the rear tyre touches the
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
  skin: '#c9d3e3',
  hair: '#d9963a',
  jacket: '#202329',
  trousers: '#46523f',
  shoes: '#f1f2f4',
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

function faceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.skin;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#16181d';
  ctx.beginPath();
  ctx.ellipse(22, 28, 3.5, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(42, 28, 3.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#16181d';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(32, 38, 9, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  return canvasTexture(canvas);
}

/** The blocky rider, seated: hips over the seat, hands on the bars, feet on the pegs. */
function rider() {
  const group = new THREE.Group();
  const skin = standard(COLORS.skin, { roughness: 0.6 });
  const jacket = standard(COLORS.jacket, { roughness: 0.55 });
  const trousers = standard(COLORS.trousers, { roughness: 0.8 });
  const hair = standard(COLORS.hair, { roughness: 0.7 });
  const shoes = standard(COLORS.shoes, { roughness: 0.5 });

  // Torso, leaning a little forward.
  boxPart(group, [1.05, 2.1, 2.0], jacket, { position: [2.05, 5.45, 0], rotation: [0, 0, -0.18] });
  boxPart(group, [1.1, 0.35, 2.05], standard('#30343d', { roughness: 0.5 }), { position: [1.95, 4.5, 0], rotation: [0, 0, -0.18] }); // belt
  for (const z of [-0.85, 0.85]) {
    bar(group, [1.75, 4.3], [3.45, 4.15], z, 0.95, trousers); // thigh
    bar(group, [3.45, 4.25], [3.75, 2.35], z, 0.95, trousers); // shin
    boxPart(group, [1.35, 0.55, 1.0], shoes, { position: [3.95, 2.05, z] });
  }
  for (const z of [-1.3, 1.3]) {
    bar(group, [2.2, 6.15], [5.25, 5.3], z, 0.85, jacket); // arm out to the grip
    boxPart(group, [0.6, 0.6, 0.6], standard('#121318', { roughness: 0.6 }), { position: [5.4, 5.25, z] }); // glove
  }
  // Head with its face on the front (+x) side, and the hair.
  const face = new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.6 });
  boxPart(group, [1.3, 1.25, 1.3], [face, skin, skin, skin, skin, skin], { position: [2.3, 7.15, 0], rotation: [0, 0, -0.1] });
  boxPart(group, [1.5, 0.5, 1.5], hair, { position: [2.2, 7.9, 0], rotation: [0, 0, -0.1] });
  boxPart(group, [0.5, 1.2, 1.45], hair, { position: [1.6, 7.35, 0] });
  for (const [x, z, tilt] of [[2.5, -0.4, 0.5], [2.0, 0.3, -0.3], [2.7, 0.45, 0.2]]) {
    part(group, new THREE.ConeGeometry(0.35, 0.8, 5), hair, { position: [x, 8.3, z], rotation: [tilt, 0, -0.5] });
  }
  return group;
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

  group.add(rider());
  return { group, rear, front };
}

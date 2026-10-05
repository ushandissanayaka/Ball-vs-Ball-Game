import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NEON, PROP } from '../../config/palette.js';
import { createParticleField, puffTexture, shardTexture } from '../../effects/smokeParticles.js';
import { dotTexture } from '../../effects/glowTextures.js';
import { chain, helixPoints, ringPoints } from '../../util/chain.js';
import { canvasTexture, DISPLAY_FONT } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { mulberry32 } from '../../util/random.js';
import { createBikeRider } from './BikeRider.js';
import { batchStatic } from '../../util/staticBatch.js';

/*
 * The limited-time offer's show, a 10-second loop (after the reference shots). Layout: the BUY box in the middle
 * front, the chained ball floating above and behind it, the bike on the right facing the viewer.
 *   0.6–2.9  the rider pops a steep wheelie, rocks side to side on the back wheel and slams the front down;
 *            red and black smoke pours off the flaming rear wheel. Meanwhile a big WARNING flashes and huge
 *            chain links swirl round the ball, and a column of red smoke erupts behind it.
 *   3.0–5.4  the bike weaves left and right on both wheels.
 *   5.6–7.9  a second wheelie; at 6.0 the ball bursts into a chain-wrapped blocky figure floating in the air:
 *            chains spiral round it, red flames and black shards stream off it and red lightning crackles.
 *   8.9–9.9  the figure collapses into smoke and the ball reforms, and the loop starts over.
 * Everything here moves, so none of it casts shadows (the shadow map is drawn once); the particles are worked
 * out on the GPU (see smokeParticles.js), and the CPU only moves a dozen objects each frame.
 */

export const PERIOD = 10;

const BIKE_AT = new THREE.Vector3(10, 1.4, -5); // where the rear tyre touches the plinth
const BIKE_SCALE = 1.6; // big enough for the Legion rider on it
// Heading left and toward the viewer, three-quarters side on so the wheelie reads: local +x turned to (-0.85, 0, 0.53).
const BIKE_YAW = -2.17; // facing the spawn point (the hub's middle), where players start
const BIKE_BACK = new THREE.Vector3(0.85, 0, -0.53); // the way the rear-wheel smoke blows
const SUMMON = new THREE.Vector3(-2.6, 1.4, -1.2); // floor point under the ball and the figure
const BALL_HEIGHT = 10.5;
const FIGURE_BASE = 5.6; // height of the floating figure's feet (above the BUY box)
const WHEELIES = [[0.6, 2.9], [5.6, 7.9]]; // [start, slam] of each wheelie in the loop

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeIn = (x) => x ** 3;
const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
const phase = (c, from, to) => clamp01((c - from) / (to - from));
/** Stable 0..1 noise for an integer: drives the lightning flicker. */
const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const RED = ['#d80f26', '#f21c34', '#ff3a50'];
const HOT = '#ffc4cd';
const DARK = ['#120507', '#240a10', '#05030a'];

/** How far the bike's front is lifted (radians) at loop time c: a steep wheelie, held, then slammed down. */
function wheeliePitch(c) {
  const LIFT = 1.0;
  for (const [from, to] of WHEELIES) {
    if (c < from || c > to + 0.6) continue;
    if (c < from + 0.55) return easeOut(phase(c, from, from + 0.55)) * LIFT;
    if (c < to - 0.3) return LIFT + Math.sin((c - from) * 6) * 0.06;
    if (c < to) return (LIFT + Math.sin((to - 0.3 - from) * 6) * 0.06) * (1 - easeIn(phase(c, to - 0.3, to)));
    const bounce = phase(c, to, to + 0.6);
    return -0.07 * Math.sin(bounce * Math.PI) * (1 - bounce); // forks compress on landing
  }
  return 0;
}

/** Side-to-side lean (radians): rocking on the back wheel in a wheelie, weaving on both wheels after. */
function bikeRoll(c, seconds) {
  const inWheelie = WHEELIES.some(([from, to]) => c > from + 0.4 && c < to - 0.2);
  if (inWheelie) return Math.sin(seconds * 5.5) * 0.2;
  if (c > 3.0 && c < 5.4) return Math.sin((c - 3.0) * Math.PI * 1.25) * 0.3 * Math.sin(phase(c, 3.0, 5.4) * Math.PI);
  return Math.sin(seconds * 1.3) * 0.03;
}

/**
 * The particle fields: red smoke and flames, dark smoke, black shards, and hot white-pink sparks. Only the
 * sparks add light: added light washes out to pink against the bright sky, so the red smoke is drawn solid.
 */
function createParticles() {
  const rand = mulberry32(77);
  const r = () => rand() - 0.5;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const glowing = [];
  const dark = [];
  const shards = [];
  const hot = [];
  const add = (list, birth, life, start, end, size, color) =>
    (color === HOT ? hot : list).push({ birth, life, start, end, size, color, seed: rand() });
  const summon = (dx, y, dz) => [SUMMON.x + dx, y, SUMMON.z + dz];

  // Smoke off the rear wheel during both wheelies, blowing back and up.
  for (let i = 0; i < 72; i += 1) {
    const [from, to] = WHEELIES[i % 2];
    const birth = from + (Math.floor(i / 2) / 36) * (to - from + 0.4);
    const start = [BIKE_AT.x + r() * 1.2, BIKE_AT.y + 0.6 + rand() * 1.4, BIKE_AT.z + r() * 1.2];
    const drift = 4 + rand() * 4;
    const end = [start[0] + BIKE_BACK.x * drift + r() * 3, start[1] + 3 + rand() * 4, start[2] + BIKE_BACK.z * drift + r() * 3];
    if (i % 3 === 2) add(dark, birth, 1.6 + rand() * 0.8, start, end, [0.9, 3.4 + rand() * 1.4], pick(DARK));
    else add(glowing, birth, 1.4 + rand() * 0.8, start, end, [0.9, 3.2 + rand() * 1.5], pick(RED));
  }
  // The eruption the ball rises from.
  for (let i = 0; i < 80; i += 1) {
    const birth = 1.0 + (i / 80) * 1.9;
    const start = summon(r() * 2.4, 5.4, r() * 2.4);
    const end = summon(r() * 6, 11 + rand() * 8, r() * 6);
    if (i % 3 === 2) add(dark, birth, 1.3 + rand() * 0.8, start, end, [2, 6 + rand() * 3], pick(DARK));
    else add(glowing, birth, 1.1 + rand() * 0.9, start, end, [2 + rand(), 5.5 + rand() * 3], i < 12 ? HOT : pick(RED));
  }
  // Red wisps curling off the floating ball.
  for (let i = 0; i < 24; i += 1) {
    const a = rand() * Math.PI * 2;
    const start = summon(Math.cos(a) * 2.6, BALL_HEIGHT + r() * 3, Math.sin(a) * 2.6);
    add(glowing, 4.0 + (i / 24) * 2.2, 0.9, start, [start[0] + Math.cos(a) * 1.2, start[1] + 2.5, start[2] + Math.sin(a) * 1.2], [0.8, 2.2], pick(RED));
  }
  // The burst as the ball becomes the figure.
  for (let i = 0; i < 30; i += 1) {
    const dir = new THREE.Vector3(r(), r(), r()).normalize().multiplyScalar(6);
    const start = summon(0, BALL_HEIGHT, 0);
    add(glowing, 6.0 + (i / 30) * 0.5, 0.7 + rand() * 0.4, start, [start[0] + dir.x, start[1] + dir.y, start[2] + dir.z], [2, 5], i % 2 ? HOT : pick(RED));
  }
  // Flames and black shards streaming off the figure while it floats.
  for (let i = 0; i < 60; i += 1) {
    const start = summon(r() * 3, FIGURE_BASE + rand() * 7.5, r() * 3);
    add(glowing, 6.4 + (i / 60) * 2.6, 0.7 + rand() * 0.6, start, [start[0] + r() * 3, start[1] + 3 + rand() * 4, start[2] + r() * 3], [1, 2.6 + rand()], pick(RED));
  }
  for (let i = 0; i < 45; i += 1) {
    const start = summon(r() * 2.5, FIGURE_BASE + rand() * 7.5, r() * 2.5);
    const dir = new THREE.Vector3(r(), rand() * 0.6, r()).normalize().multiplyScalar(4 + rand() * 5);
    add(shards, 6.4 + (i / 45) * 2.7, 1 + rand() * 0.6, start, [start[0] + dir.x, start[1] + dir.y + 2, start[2] + dir.z], [0.6, 0.95], pick(DARK));
  }
  // The figure collapsing into smoke.
  for (let i = 0; i < 50; i += 1) {
    const start = summon(r() * 3, FIGURE_BASE + rand() * 7, r() * 3);
    const end = summon(r() * 7, 2 + rand() * 4, r() * 7);
    if (i % 2) add(dark, 8.9 + (i / 50) * 0.55, 1 + rand() * 0.6, start, end, [2.5, 6], pick(DARK));
    else add(glowing, 8.9 + (i / 50) * 0.55, 1 + rand() * 0.6, start, end, [2.5, 6], pick(RED));
  }

  const puff = puffTexture();
  return [
    createParticleField(dark, { map: puff, period: PERIOD, opacity: 0.85 }),
    createParticleField(glowing, { map: puff, period: PERIOD, opacity: 0.95 }),
    createParticleField(hot, { map: puff, period: PERIOD, blending: THREE.AdditiveBlending, opacity: 0.9 }),
    createParticleField(shards, { map: shardTexture(), period: PERIOD }),
  ];
}

/** The summoned ball: dark and glossy, bound by two glowing chain rings that cross in an X. */
function createChainedBall() {
  const group = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 20), standard('#1d1a24', { roughness: 0.25, metalness: 0.6 }));
  group.add(ball);
  const redGlow = glow(NEON.red, 2.2);
  const rings = new THREE.Group();
  for (const tilt of [Math.PI / 4, -Math.PI / 4]) {
    const ring = chain(ringPoints(2.75, 20, (a, r) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)), redGlow, { linkRadius: 0.45, tube: 0.13, cast: false });
    ring.rotation.set(0, Math.PI / 2, tilt);
    rings.add(ring);
  }
  group.add(rings);
  return { group, ball, rings };
}

/** A jagged lightning bolt as one mesh: thin glowing bars between points that zig-zag away from `from`. */
function bolt(rand, from, direction, length) {
  const steps = 6;
  const points = [from.clone()];
  for (let i = 1; i <= steps; i += 1) {
    const p = from.clone().addScaledVector(direction, (length * i) / steps);
    p.add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(1.4));
    points.push(p);
  }
  const pieces = [];
  for (let i = 0; i < steps; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const piece = new THREE.BoxGeometry(0.16, 0.16, a.distanceTo(b));
    piece.applyMatrix4(new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0)).setPosition(a.clone().lerp(b, 0.5)));
    pieces.push(piece);
  }
  const mesh = new THREE.Mesh(mergeGeometries(pieces), glow('#ff5266', 2.6));
  pieces.forEach((piece) => piece.dispose());
  return mesh;
}

/** The chain-wrapped figure: a dark blocky body, chains spiralling round it, a chain spike and lightning. */
function createChainFigure() {
  const group = new THREE.Group();
  const metal = standard('#2b2e37', { roughness: 0.35, metalness: 0.75 });
  const body = new THREE.Group();
  const limb = (size, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), metal);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    body.add(mesh);
  };
  limb([1.6, 1.5, 1.6], [0, 7.05, 0]); // head
  limb([2.2, 2.3, 1.15], [0, 5.1, 0]); // torso
  limb([1, 2.2, 1], [-1.65, 5.0, 0], [0, 0, -0.35]); // arms, a little out
  limb([1, 2.2, 1], [1.65, 5.0, 0], [0, 0, 0.35]);
  limb([1, 2.4, 1], [-0.55, 2.75, 0], [0, 0, -0.08]); // legs
  limb([1, 2.4, 1], [0.55, 2.75, 0], [0, 0, 0.08]);
  for (const x of [-0.4, 0.4]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.1), glow('#ff3347', 2.8));
    eye.position.set(x, 7.15, 0.81);
    body.add(eye);
  }
  batchStatic(body); // a rigid figure: one mesh per material
  group.add(body);

  const redGlow = glow(NEON.red, 2.2);
  const darkMetal = standard(PROP.chainDark, { roughness: 0.35, metalness: 0.8 });
  const helixA = chain(helixPoints({ radius: 2.4, from: 1.2, to: 8.4, turns: 1.6, count: 36 }), redGlow, { linkRadius: 0.42, tube: 0.12, cast: false });
  const helixB = chain(helixPoints({ radius: 2.9, from: 0.6, to: 7.6, turns: 1.3, count: 36, phase: Math.PI }), darkMetal, { linkRadius: 0.5, tube: 0.15, cast: false });
  group.add(helixA, helixB);
  // The chain spike shooting up from the shoulder, with a glowing tip.
  const spikePoints = Array.from({ length: 11 }, (_, i) => new THREE.Vector3(1.4 + i * 0.4, 6.2 + i * 0.75, -0.3 - i * 0.08));
  group.add(chain(spikePoints, darkMetal, { linkRadius: 0.5, tube: 0.16, cast: false }));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), glow('#ff4a5c', 2.4));
  tip.position.set(5.8, 14.2, -1.2);
  tip.rotation.z = -0.5;
  group.add(tip);

  const rand = mulberry32(5);
  const bolts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + rand();
    const from = new THREE.Vector3(Math.cos(a) * 1.2, 3 + rand() * 4, Math.sin(a) * 1.2);
    const mesh = bolt(rand, from, new THREE.Vector3(Math.cos(a), rand() - 0.6, Math.sin(a)).normalize(), 4 + rand() * 3);
    mesh.visible = false;
    group.add(mesh);
    bolts.push(mesh);
  }
  return { group, body, helixA, helixB, bolts };
}

/** The striped pink "WARNING" plate floating over the bike. */
function warningSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,170,190,0.85)';
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = 'rgba(255,90,120,0.75)';
  for (let x = -80; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x + 16, 80);
    ctx.lineTo(x + 96, 0);
    ctx.lineTo(x + 80, 0);
    ctx.fill();
  }
  ctx.font = `42px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c4142e';
  ctx.fillText('WARNING', 128, 42);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(4.8, 1.5, 1);
  return sprite;
}

/** Huge chain links (pink-glowing and dark, alternating) in a ring that swirls round the ball. */
function createChainSwirl() {
  const group = new THREE.Group();
  const points = ringPoints(5.6, 24, (a, r) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  const arcs = [[0, 6], [12, 18]];
  for (const [from, to] of arcs) group.add(chain(points.slice(from, to + 1), glow('#ff8fa6', 2.2), { linkRadius: 0.9, tube: 0.26, cast: false }));
  for (const [from, to] of [[6, 12], [18, 24]]) {
    group.add(chain(points.slice(from, to + 1), standard(PROP.chainDark, { roughness: 0.35, metalness: 0.8 }), { linkRadius: 0.9, tube: 0.28, cast: false }));
  }
  return group;
}

/** The big glowing "WARNING" that flashes over the ball. */
function bigWarning() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = `92px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff3355';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffe3e8';
  ctx.fillText('WARNING', 256, 68);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(16, 4, 1);
  return sprite;
}

/** Builds the show. Returns { group, update(seconds) }; it lives in the limited shop's own space. */
export function createLimitedShowcase() {
  const group = new THREE.Group();
  group.name = 'limited-showcase';
  group.userData.dynamic = true; // keep the static batcher's hands off: all of this moves

  // Bike: heading (yaw) -> side lean (roll, about its own forward axis) -> wheelie (pitch, round the rear tyre).
  const bike = createBikeRider();
  bike.group.scale.setScalar(BIKE_SCALE);
  const lean = new THREE.Group();
  lean.add(bike.group);
  const heading = new THREE.Group();
  heading.position.copy(BIKE_AT);
  heading.rotation.y = BIKE_YAW;
  heading.add(lean);
  group.add(heading);
  // Soft shadow under the bike (the real shadow map is static): shortens as the front lifts.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(12.5, 4.2),
    new THREE.MeshBasicMaterial({ map: dotTexture(), color: '#000000', transparent: true, opacity: 0.5, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(4.1 * BIKE_SCALE, 0.04, 0);
  heading.add(shadow);

  const triangle = new THREE.Mesh(new THREE.TorusGeometry(2, 0.28, 4, 3), glow(NEON.red, 2.4));
  triangle.position.set(11, 11.5, -3.5);
  triangle.rotation.z = Math.PI / 2;
  group.add(triangle);
  const warning = warningSign();
  warning.position.set(6.5, 14, -3.5);
  group.add(warning);
  const swirl = createChainSwirl();
  swirl.position.set(SUMMON.x, BALL_HEIGHT, SUMMON.z);
  group.add(swirl);
  const shout = bigWarning();
  shout.position.set(SUMMON.x, BALL_HEIGHT - 1, SUMMON.z + 3);
  group.add(shout);

  const ball = createChainedBall();
  ball.group.position.set(SUMMON.x, BALL_HEIGHT, SUMMON.z);
  group.add(ball.group);
  const figure = createChainFigure();
  figure.group.position.set(SUMMON.x, FIGURE_BASE, SUMMON.z);
  group.add(figure.group);
  // Red light pooling on the plinth while the summon is going on.
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ map: dotTexture(), color: NEON.red, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(SUMMON.x, SUMMON.y + 0.05, SUMMON.z - 1);
  group.add(pool);

  const particles = createParticles();
  group.add(...particles);

  const update = (seconds) => {
    const c = seconds % PERIOD;

    // Bike: engine shake, the wheelie, and the wheels turning (fast while it revs).
    const pitch = wheeliePitch(c);
    bike.group.rotation.z = pitch;
    lean.rotation.x = bikeRoll(c, seconds);
    heading.position.y = BIKE_AT.y + Math.sin(seconds * 55) * (pitch > 0.05 ? 0.01 : 0.03); // engine shake
    const revving = pitch > 0.05 || (c > 3.0 && c < 5.4);
    bike.rear.rotation.z = -seconds * (revving ? 18 : 6);
    bike.front.rotation.z = -seconds * (pitch > 0.05 ? 2 : revving ? 18 : 6);
    shadow.scale.x = 1 - pitch * 0.4;
    // The big WARNING and the swirling chain links, while each wheelie is up.
    const alarm = Math.max(...WHEELIES.map(([from, to]) => phase(c, from + 0.3, from + 0.6) * (1 - phase(c, to - 0.2, to + 0.2))));
    shout.visible = alarm > 0.01;
    shout.material.opacity = alarm * (Math.sin(seconds * 14) > 0 ? 1 : 0.4);
    swirl.visible = alarm > 0.01;
    swirl.scale.setScalar(0.6 + alarm * 0.4);
    swirl.rotation.z = seconds * 1.8;
    triangle.scale.setScalar(1 + Math.sin(seconds * 6) * 0.08);
    warning.material.opacity = 0.65 + Math.sin(seconds * 6) * 0.3;

    // Ball: floats over the BUY box, bursts into the figure at 6.1 and reforms at 9.3.
    const ballScale = c < 9.3 ? 1 - easeIn(phase(c, 6.1, 6.6)) : easeOutBack(phase(c, 9.3, 9.9));
    ball.group.visible = ballScale > 0.001;
    ball.group.scale.setScalar(Math.max(ballScale, 0.001));
    ball.group.position.y = BALL_HEIGHT + Math.sin(seconds * 2) * 0.3;
    ball.ball.rotation.y = seconds * 1.4;
    ball.rings.rotation.y = -seconds * 0.9;

    // Figure: bursts out, floats with its chains whirling and lightning crackling, then collapses.
    const figureScale = easeOutBack(phase(c, 6.2, 6.8)) * (1 - easeIn(phase(c, 8.95, 9.45)));
    figure.group.visible = figureScale > 0.001;
    figure.group.scale.setScalar(Math.max(figureScale, 0.001));
    figure.group.position.y = FIGURE_BASE + Math.sin(seconds * 1.6) * 0.35;
    figure.body.rotation.y = Math.sin(seconds * 0.7) * 0.3;
    figure.helixA.rotation.y = seconds * 2.2;
    figure.helixB.rotation.y = -seconds * 1.7;
    const flash = Math.floor(seconds * 14);
    figure.bolts.forEach((mesh, i) => { mesh.visible = figureScale > 0.5 && hash(flash + i * 17) > 0.7; });

    const summoning = Math.max(phase(c, 0.8, 1.4) * (1 - phase(c, 9.2, 9.8)), 0);
    pool.material.opacity = summoning * (0.55 + Math.sin(seconds * 9) * 0.15);
    pool.visible = summoning > 0.01;

    for (const field of particles) field.userData.update(c);
  };
  update(0);
  return { group, update };
}

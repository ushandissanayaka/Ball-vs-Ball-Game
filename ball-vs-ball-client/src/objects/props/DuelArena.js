import * as THREE from 'three';
import { arenaBase } from '../../config/layout.js';
import { DUEL_BOX, LABEL, NEON, PROP } from '../../config/palette.js';
import { additive, fadeTexture, haloTexture } from '../../effects/glowTextures.js';
import { SIM } from '../../shared/duelSim.js';
import { canvasTexture, createLabel } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box, sphere } from '../../util/mesh.js';

// The two balls shown fighting on a match screen, by row. `spiky` gives the second ball white spikes.
const MATCHUPS = [
  ['#3fbf5a', '#e04646', true],
  ['#f2c230', '#e04646', false],
  ['#f07a2a', '#e04646', true],
  ['#f4f6fb', '#9b59d6', false],
  ['#2f86ea', '#ff7fbf', true],
];

const PAD = 6.4;
const TOP = 1.2;
const PAD_X = 5.6; // the squares' middle: the players stand about level with the board
// Seen from the lane, pink is on the left and blue on the right (as in the reference shots). The squares sit
// either side of the board, so the two players stand beside it, facing the lane.
export const SIDES = {
  pink: { z: -11.3, color: NEON.pink, gem: '#ff9cc9' },
  blue: { z: 11.3, color: NEON.blue, gem: '#8fd0ff' },
};
/**
 * The duel box: a square opening `inner` wide, `depth` deep, in a frame `frame` thick, its opening's bottom
 * `bottom` above the base. It stands at x = `x`, its open face toward the lane.
 */
const BOX = { inner: 12.6, depth: 2.6, frame: 0.7, bottom: 0.7, x: 6.8 };
const SIM_SCALE = BOX.inner / SIM.size;
const BOX_MID_Y = BOX.bottom + BOX.inner / 2; // middle of the opening, over the base top

/** Square outline on the floor (a player's standing spot). */
function padOutline(parent, material, [x, y, z], thickness, size = PAD) {
  box(parent, [size, 0.12, thickness], material, { position: [x, y, z - size / 2], cast: false });
  box(parent, [size, 0.12, thickness], material, { position: [x, y, z + size / 2], cast: false });
  box(parent, [thickness, 0.12, size], material, { position: [x - size / 2, y, z], cast: false });
  box(parent, [thickness, 0.12, size], material, { position: [x + size / 2, y, z], cast: false });
}

const playerLines = (players, capacity, reward) => [
  { text: `${players} / ${capacity} PLAYERS`, size: 60, fill: LABEL.arena.fill, stroke: LABEL.arena.stroke, strokeWidth: 7 },
  { text: `Win ${reward}`, size: 52, fill: LABEL.reward.fill, stroke: LABEL.reward.stroke, strokeWidth: 6, coin: true },
];

/** The VS screen's face: blue with lighter scan stripes (the pictures, countdown and "VS" are separate planes). */
function faceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = DUEL_BOX.screen;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = DUEL_BOX.scanline;
  for (let y = 6; y < 512; y += 22) ctx.fillRect(0, y, 512, 8);
  return canvasTexture(canvas);
}

/** Big white outlined text (the countdown digit, "VS") on a clear background. */
function bigText(canvas, text) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${canvas.height * 0.6}px "Michroma", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = canvas.height * 0.09;
  ctx.strokeStyle = '#0d0f14';
  ctx.strokeText(text, canvas.width / 2, canvas.height * 0.53);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height * 0.53);
}

function textPlane(size, text) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  bigText(canvas, text);
  const texture = canvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  let shown = text;
  mesh.userData.setText = (next) => {
    if (next === shown) return;
    shown = next;
    bigText(canvas, next);
    texture.needsUpdate = true;
  };
  return mesh;
}

/** One player spot: its square, the brighter glowing square shown while someone stands there, its hex gem
 *  on a little base off the arena's end, and the light beam that rises from the gem. */
function addSpot(group, depth, side) {
  const { z, color, gem } = SIDES[side];
  padOutline(group, glow(color, 1.25), [PAD_X, TOP + 0.06, z], 0.45);
  const lit = new THREE.Group();
  padOutline(lit, glow(color, 2.8), [PAD_X, TOP + 0.1, z], 0.75);
  // Soft glow either side of the lit outline.
  for (const size of [PAD + 1.2, PAD - 1.2]) padOutline(lit, additive(haloTexture(), color, 0.5), [PAD_X, TOP + 0.08, z], 1.4, size);
  lit.visible = false;
  lit.userData.dynamic = true; // shown later: the static batcher must not merge it
  group.add(lit);

  const gemZ = Math.sign(z) * (depth / 2 + 3.6);
  addMesh(group, new THREE.CylinderGeometry(2.1, 2.3, 0.6, 6), standard(PROP.plinth, { roughness: 0.5 }), { position: [0, 0.3, gemZ] });
  const gemMesh = addMesh(group, new THREE.CylinderGeometry(1.5, 1.5, 0.5, 6), standard(gem, { roughness: 0.25, emissive: color, emissiveIntensity: 0.4 }), {
    position: [0, 0.85, gemZ],
  });
  gemMesh.userData.dynamic = true; // brightens while the spot is taken
  // Light beam: a widening column, bright at the gem and fading upward.
  const column = new THREE.CylinderGeometry(3.4, 1.4, 18, 24, 1, true);
  column.rotateX(Math.PI); // brightest end of the fade texture at the bottom
  column.translate(0, 9, 0); // grows up from the gem
  const beam = addMesh(group, column, additive(fadeTexture(), '#fff2f6', 0.7), { position: [0, 1, gemZ], cast: false, receive: false });
  beam.renderOrder = 3;
  beam.visible = false;
  beam.userData.dynamic = true;
  return { lit, gem: gemMesh, beam };
}

/**
 * The duel box that rises up behind the squares when someone joins: a deep dark frame round a recessed back
 * panel (the balls fight inside it), with the blue VS screen across its opening until the fight begins.
 */
function addBoard(group) {
  const pivot = new THREE.Group(); // at the base's top: the board grows up out of it
  pivot.position.set(BOX.x, TOP, 0);
  pivot.rotation.y = -Math.PI / 2; // local +z faces the lane; seen from the lane, local -x is the pink side
  pivot.userData.dynamic = true;
  group.add(pivot);

  const { inner: W, depth: D, frame: F, bottom: B } = BOX;
  const frame = standard(DUEL_BOX.frame, { roughness: 0.55, metalness: 0.15 });
  const wall = standard(DUEL_BOX.wall, { roughness: 0.8 });
  const options = { cast: false };
  // Frame: four deep borders (their inner faces are the box's walls) and a back panel.
  box(pivot, [W + 2 * F, F, D + 0.3], frame, { ...options, position: [0, B + W + F / 2, -D / 2] });
  box(pivot, [W + 2 * F, F, D + 0.3], frame, { ...options, position: [0, B - F / 2, -D / 2] });
  for (const sign of [-1, 1]) box(pivot, [F, W, D + 0.3], frame, { ...options, position: [sign * (W / 2 + F / 2), B + W / 2, -D / 2] });
  box(pivot, [W + 2 * F, W + 2 * F, 0.3], frame, { ...options, position: [0, B + W / 2, -D - 0.3] });
  box(pivot, [W, W, 0.05], wall, { ...options, position: [0, B + W / 2, -D - 0.12] });
  // Inner walls a shade lighter than the frame, so the box reads as deep.
  const inset = standard(DUEL_BOX.inset, { roughness: 0.75 });
  box(pivot, [W, 0.04, D], inset, { ...options, position: [0, B + 0.02, -D / 2] });
  box(pivot, [W, 0.04, D], standard(DUEL_BOX.insetDark, { roughness: 0.75 }), { ...options, position: [0, B + W - 0.02, -D / 2] });
  for (const sign of [-1, 1]) box(pivot, [0.04, W, D], inset, { ...options, position: [sign * (W / 2 - 0.02), B + W / 2, -D / 2] });

  // The balls, the aim arrow and the hit effects live here: the box's back, in the duel simulation's units.
  const fightLayer = new THREE.Group();
  fightLayer.position.set(-W / 2, B, -D);
  fightLayer.scale.setScalar(SIM_SCALE);
  pivot.add(fightLayer);

  // The VS screen hangs from the top of the opening, so shrinking it rolls it up like a blind.
  const face = new THREE.Group();
  face.position.set(0, B + W, 0.18);
  pivot.add(face);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, W + 0.3), new THREE.MeshBasicMaterial({ map: faceTexture(), toneMapped: false }));
  screen.position.y = -W / 2;
  face.add(screen);
  // Pictures: the pink player top left, the blue player bottom right, as in the reference.
  const pictures = {};
  for (const [side, x, y] of [['pink', -W * 0.24, -W * 0.27], ['blue', W * 0.24, -W * 0.73]]) {
    const picture = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 5.4),
      new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }),
    );
    picture.position.set(x, y, 0.02);
    picture.visible = false;
    face.add(picture);
    pictures[side] = picture;
  }
  const countdown = textPlane(5.6, '3');
  countdown.position.set(0, -W / 2, 0.04);
  countdown.visible = false;
  face.add(countdown);
  const vs = textPlane(5.6, 'VS');
  vs.position.set(0, -W / 2, 0.04);
  face.add(vs);

  pivot.scale.y = 0.001;
  pivot.visible = false;
  return { pivot, face, pictures, countdown, vs, fightLayer };
}

/** Match arena: the standing screen on the outer edge, facing the lane, with the two balls fighting on it. */
function addMatchScreen(group, width, depth, row) {
  const screen = new THREE.Group();
  screen.position.set(width / 2 - 1.2, TOP, 0);
  screen.rotation.y = -Math.PI / 2;
  group.add(screen);
  block(screen, [depth - 4, 0.8, 2.6], standard(PROP.boardStand, { roughness: 0.5 }));
  block(screen, [depth - 2, 15, 1.6], standard(PROP.arenaFrame, { roughness: 0.45, metalness: 0.2 }), { position: [0, 0.8, 0] });
  box(screen, [depth - 4, 12.8, 0.12], standard(PROP.arenaScreen, { roughness: 0.3, metalness: 0.1 }), { position: [0, 8.3, 0.82] });
  const [colorA, colorB, spiky] = MATCHUPS[row % MATCHUPS.length];
  sphere(screen, 1.7, standard(colorA, { roughness: 0.25 }), { position: [-4, 8.3, 2.3] });
  sphere(screen, 1.7, standard(colorB, { roughness: 0.25 }), { position: [4, 8.3, 2.3] });
  if (spiky) {
    const spike = standard('#ffffff', { roughness: 0.3 });
    for (const dy of [-0.6, 0.6]) {
      addMesh(screen, new THREE.ConeGeometry(0.3, 1.4, 8), spike, { position: [2, 8.3 + dy, 2.3], rotation: [0, 0, Math.PI / 2] });
    }
  }
}

const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
const approach = (value, target, step) => (value < target ? Math.min(target, value + step) : Math.max(target, value - step));

/**
 * One 1v1 arena on a runway deck: a dark square base with either player spots ('pads') or a fight screen
 * ('match'). Built for the east deck (lane to the west, -x); the west deck's arenas are the same turned half a
 * circle. Pads arenas also carry the duel box, and everything the duel director (scene/duel) moves:
 *   spotAt(worldPoint)            which square ('pink' / 'blue') a point stands on, or null
 *   spotPose(side, position)      where a player stands on that square (world), and the yaw facing the lane
 *   setOccupants({ pink, blue })  lights the squares of the sides that are true or a picture texture, and
 *                                 raises the box (with the pictures on its VS screen) while anyone is there
 *   setCountdown(n | null)        the big digit on the VS screen (null: "VS")
 *   setScreenOpen(open)           rolls the VS screen up (the box is open for the fight) or back down
 *   launchBeams() / resetBeams()  the spotlights shoot up into the sky and go out / come back
 *   fightLayer, simToLocal()      where the balls go: the box's back, in duel-simulation units
 *   pickSim(ray)                  the simulation point a ray (from the camera) hits on the box's back
 *   framing(fov, aspect, pos, target, toward, amount)   the duel camera: the box and both players in view,
 *                                 panned `amount` (0..1) toward side `toward`
 *   update(dt)                    moves all of that; true while anything is moving
 *   setPlayers(players, capacity, reward), setLabelVisible(shown)   the floating players label
 */
export function createDuelArena({ row = 0, mode = 'pads' } = {}) {
  const group = new THREE.Group();
  group.name = 'duel-arena';
  const [width, depth] = arenaBase(mode);
  block(group, [width, TOP, depth], standard(PROP.plinth, { roughness: 0.5 }));
  const trim = standard(PROP.plinthTrim, { roughness: 0.4 });
  const inset = 0.3;
  for (const [w, d, x, z] of [
    [width, 0.4, 0, -depth / 2 + inset], [width, 0.4, 0, depth / 2 - inset],
    [0.4, depth, -width / 2 + inset, 0], [0.4, depth, width / 2 - inset, 0],
  ]) {
    box(group, [w, 0.12, d], trim, { position: [x, TOP + 0.06, z], cast: false });
  }

  if (mode === 'match') {
    addMatchScreen(group, width, depth, row);
    return { group, mode, setPlayers: () => {}, spotAt: () => null, update: () => false };
  }

  const spots = { pink: addSpot(group, depth, 'pink'), blue: addSpot(group, depth, 'blue') };
  const board = addBoard(group);
  const label = createLabel(playerLines(0, 2, 100), { worldHeight: 4.2 });
  label.position.set(2, 8.6, 0); // in front of where the box rises, between the squares
  group.add(label);

  const inverse = new THREE.Matrix4();
  const local = new THREE.Vector3();
  const spotAt = (point) => {
    inverse.copy(group.matrixWorld).invert();
    local.copy(point).applyMatrix4(inverse);
    if (Math.abs(local.x - PAD_X) > PAD / 2) return null;
    for (const [side, { z }] of Object.entries(SIDES)) if (Math.abs(local.z - z) <= PAD / 2) return side;
    return null;
  };

  const towardLane = new THREE.Vector3();
  const spotPose = (side, position) => {
    group.updateMatrixWorld();
    group.localToWorld(position.set(PAD_X - 0.6, TOP, SIDES[side].z));
    towardLane.set(-1, 0, 0).transformDirection(group.matrixWorld);
    return Math.atan2(towardLane.x, towardLane.z); // the character model faces +z
  };

  let raised = 0; // 0 down .. 1 up
  let raiseTarget = 0;
  let screen = 1; // 1 down (VS showing) .. 0 rolled up
  let screenTarget = 1;
  let beamLaunch = -1; // < 0: beams at rest; 0..1 shooting up; 1: gone
  const lit = { pink: false, blue: false };

  const setOccupants = (occupants) => {
    for (const [name, spot] of Object.entries(spots)) {
      const on = Boolean(occupants[name]);
      lit[name] = on;
      spot.lit.visible = on;
      spot.beam.visible = on && beamLaunch < 1;
      spot.gem.material = on
        ? standard(SIDES[name].gem, { roughness: 0.2, emissive: SIDES[name].color, emissiveIntensity: 1.6 })
        : standard(SIDES[name].gem, { roughness: 0.25, emissive: SIDES[name].color, emissiveIntensity: 0.4 });
      const picture = occupants[name]?.isTexture ? occupants[name] : null;
      board.pictures[name].visible = Boolean(picture);
      if (picture && board.pictures[name].material.map !== picture) {
        board.pictures[name].material.map = picture;
        board.pictures[name].material.needsUpdate = true;
      }
    }
    raiseTarget = lit.pink || lit.blue ? 1 : 0;
  };

  const setCountdown = (n) => {
    board.countdown.visible = n !== null;
    board.vs.visible = n === null;
    if (n !== null) board.countdown.userData.setText(String(n));
  };

  const setScreenOpen = (open) => { screenTarget = open ? 0 : 1; };
  const launchBeams = () => { if (beamLaunch < 0) beamLaunch = 0; };
  const resetBeams = () => {
    beamLaunch = -1;
    for (const [name, spot] of Object.entries(spots)) {
      spot.beam.visible = lit[name];
      spot.beam.position.y = 1;
      spot.beam.scale.set(1, 1, 1);
      spot.beam.material.opacity = 0.7;
    }
  };

  const update = (dt) => {
    let moving = false;
    if (raised !== raiseTarget) {
      raised = raiseTarget > raised ? Math.min(1, raised + dt * 1.6) : Math.max(0, raised - dt * 2.2);
      const shown = raiseTarget > 0 ? easeOutBack(raised) : raised;
      board.pivot.visible = raised > 0;
      board.pivot.scale.y = Math.max(0.001, shown);
      moving = true;
    }
    if (screen !== screenTarget) {
      screen = approach(screen, screenTarget, dt * 1.5);
      const eased = screen * screen * (3 - 2 * screen);
      board.face.scale.y = Math.max(0.001, eased);
      board.face.visible = screen > 0.002;
      moving = true;
    }
    if (beamLaunch >= 0 && beamLaunch < 1) {
      // The spotlights shoot up into the sky, stretching and fading as they go.
      beamLaunch = Math.min(1, beamLaunch + dt / 1.1);
      const t = beamLaunch;
      for (const [name, spot] of Object.entries(spots)) {
        spot.beam.visible = lit[name] && t < 1;
        spot.beam.position.y = 1 + t * t * 70;
        spot.beam.scale.set(1 - t * 0.5, 1 + t * 2.5, 1 - t * 0.5);
        spot.beam.material.opacity = 0.7 * (1 - t) + 0.5 * Math.sin(t * Math.PI);
      }
      moving = true;
    }
    return moving;
  };

  /** Simulation point (x, y, and the ball's radius r, all in sim units) to the fight layer's local space. */
  const simToLocal = (x, y, r, target) => target.set(x, y, r + 0.9);

  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const pickSim = (ray) => {
    board.fightLayer.updateWorldMatrix(true, false);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(board.fightLayer.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, board.fightLayer.getWorldPosition(hit));
    if (!ray.intersectPlane(plane, hit)) return null;
    board.fightLayer.worldToLocal(hit);
    return { x: hit.x, y: hit.y };
  };

  const center = new THREE.Vector3();
  const framing = (fov, aspect, position, target, toward = null, amount = 0) => {
    const half = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    // Back far enough that the box fills about 78% of the height and both players (beside it) fit across.
    const across = Math.abs(SIDES.blue.z) + 3.4;
    const distance = Math.max((BOX.inner + 2 * BOX.frame + 1.2) / (2 * half * 0.78), across / (half * aspect));
    // Panning toward a side slides the whole shot over (no zoom): the box on one side, that player on the other.
    const z = toward ? SIDES[toward].z * 0.62 * amount : 0;
    const y = TOP + BOX_MID_Y;
    group.localToWorld(target.set(BOX.x, y - amount * 1.2, z));
    group.localToWorld(position.set(BOX.x - distance * (1 - amount * 0.12), y - 0.6 - amount * 1.2, z));
    return group.localToWorld(center.set(BOX.x, y, 0));
  };

  const setPlayers = (players, capacity, reward) => label.userData.setLines(playerLines(players, capacity, reward));
  const setLabelVisible = (shown) => { label.visible = shown; };
  return {
    group, mode, setPlayers, setLabelVisible, spotAt, spotPose, setOccupants, setCountdown, setScreenOpen,
    launchBeams, resetBeams, fightLayer: board.fightLayer, simToLocal, pickSim, framing, update,
  };
}

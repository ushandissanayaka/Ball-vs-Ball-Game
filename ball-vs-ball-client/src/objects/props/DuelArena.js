import * as THREE from 'three';
import { ARENA_BASE } from '../../config/layout.js';
import { LABEL, NEON, PROP } from '../../config/palette.js';
import { createLabel } from '../../util/canvasText.js';
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

const PAD = 7.4;
const TOP = 1.2;

/** Square outline on the floor (a player's standing spot). */
function padOutline(parent, color, [x, y, z]) {
  const material = glow(color, 1.25);
  const t = 0.45;
  box(parent, [PAD, 0.12, t], material, { position: [x, y, z - PAD / 2], cast: false });
  box(parent, [PAD, 0.12, t], material, { position: [x, y, z + PAD / 2], cast: false });
  box(parent, [t, 0.12, PAD], material, { position: [x - PAD / 2, y, z], cast: false });
  box(parent, [t, 0.12, PAD], material, { position: [x + PAD / 2, y, z], cast: false });
}

const playerLines = (players, capacity, reward) => [
  { text: `${players}/${capacity} PLAYERS`, size: 60, fill: LABEL.arena.fill, stroke: LABEL.arena.stroke, strokeWidth: 7 },
  { text: `Win ${reward}`, size: 52, fill: LABEL.reward.fill, stroke: LABEL.reward.stroke, strokeWidth: 6, coin: true },
];

/** Waiting arena: blue and pink player squares on the lane side, the players label, a hex gem off each end. */
function addPads(group, depth) {
  const x = -3; // toward the lane
  padOutline(group, NEON.blue, [x, TOP + 0.06, -PAD / 2 - 0.6]);
  padOutline(group, NEON.pink, [x, TOP + 0.06, PAD / 2 + 0.6]);
  const hex = new THREE.CylinderGeometry(1.1, 1.1, 0.45, 6);
  addMesh(group, hex, standard('#8fd0ff', { roughness: 0.25, emissive: NEON.blue, emissiveIntensity: 0.5 }), {
    position: [0, 3.2, -depth / 2 - 4], rotation: [-0.5, 0, 0],
  });
  addMesh(group, hex.clone(), standard('#ff9cc9', { roughness: 0.25, emissive: NEON.pink, emissiveIntensity: 0.5 }), {
    position: [0, 3.2, depth / 2 + 4], rotation: [0.5, 0, 0],
  });
  const label = createLabel(playerLines(0, 2, 100), { worldHeight: 4.2 });
  label.position.set(x, 4.6, 0);
  group.add(label);
  return label;
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

/**
 * One 1v1 arena on a runway deck: a dark square base with either player pads ('pads') or a fight screen
 * ('match'). Built for the east deck (lane to the west, -x); the west deck's arenas are the same turned half a
 * circle. `setPlayers(players, capacity, reward)` updates the label (pads arenas only).
 */
export function createDuelArena({ row = 0, mode = 'pads' } = {}) {
  const group = new THREE.Group();
  group.name = 'duel-arena';
  const [width, depth] = ARENA_BASE;
  block(group, [width, TOP, depth], standard(PROP.plinth, { roughness: 0.5 }));
  const trim = standard(PROP.plinthTrim, { roughness: 0.4 });
  const inset = 0.3;
  for (const [w, d, x, z] of [
    [width, 0.4, 0, -depth / 2 + inset], [width, 0.4, 0, depth / 2 - inset],
    [0.4, depth, -width / 2 + inset, 0], [0.4, depth, width / 2 - inset, 0],
  ]) {
    box(group, [w, 0.12, d], trim, { position: [x, TOP + 0.06, z], cast: false });
  }

  const label = mode === 'pads' ? addPads(group, depth) : null;
  if (mode === 'match') addMatchScreen(group, width, depth, row);

  const setPlayers = (players, capacity, reward) => label?.userData.setLines(playerLines(players, capacity, reward));
  return { group, setPlayers };
}

import * as THREE from 'three';
import { DECK_THICKNESS, FLOOR_Y, HUB, HUB_CENTER_PANEL, NECK } from '../../config/layout.js';
import { PLATFORM } from '../../config/palette.js';
import { standard } from '../../util/materials.js';
import { addMesh, box } from '../../util/mesh.js';
import { deckFaces, insetLine } from './platformMaterials.js';

const DEPTH = DECK_THICKNESS;
const INSET = 7; // the thin light line inside the neon edge

/** The square hub deck with its neon edge (open on the south side where the neck leads to the runway). */
export function createHub(neon) {
  const group = new THREE.Group();
  group.name = 'hub';
  const width = HUB.maxX - HUB.minX;
  const depth = HUB.maxZ - HUB.minZ;
  const centerX = (HUB.minX + HUB.maxX) / 2;
  const centerZ = (HUB.minZ + HUB.maxZ) / 2;
  addMesh(group, new THREE.BoxGeometry(width, DEPTH, depth), deckFaces(), {
    position: [centerX, FLOOR_Y - DEPTH / 2, centerZ],
  });

  // Inset line, broken where the neck meets the south edge.
  const line = insetLine();
  const [x0, x1, z0, z1] = [HUB.minX + INSET, HUB.maxX - INSET, HUB.minZ + INSET, HUB.maxZ - INSET];
  const y = FLOOR_Y + 0.03;
  const gap = NECK.half + 4;
  box(group, [x1 - x0, 0.06, 0.5], line, { position: [centerX, y, z0], cast: false });
  box(group, [0.5, 0.06, z1 - z0], line, { position: [x0, y, centerZ], cast: false });
  box(group, [0.5, 0.06, z1 - z0], line, { position: [x1, y, centerZ], cast: false });
  box(group, [-gap - x0, 0.06, 0.5], line, { position: [(x0 - gap) / 2, y, z1], cast: false });
  box(group, [x1 - gap, 0.06, 0.5], line, { position: [(x1 + gap) / 2, y, z1], cast: false });

  // The slightly darker panel in the open middle of the hub.
  const [px0, pz0, px1, pz1] = HUB_CENTER_PANEL;
  box(group, [px1 - px0, 0.04, pz1 - pz0], standard(PLATFORM.centerPanel, { roughness: 0.4, metalness: 0.1, envMapIntensity: 0.5, transparent: true, opacity: 0.35 }), {
    position: [(px0 + px1) / 2, FLOOR_Y + 0.02, (pz0 + pz1) / 2], cast: false,
  });

  neon.rect(HUB.minX, HUB.minZ, HUB.maxX, HUB.maxZ, { y: FLOOR_Y }, { skip: ['s'] });
  const south = HUB.maxZ - 0.6;
  neon.segment([HUB.minX + 0.6, south], [-NECK.half - 1, south], { y: FLOOR_Y, outward: [0, 1] });
  neon.segment([NECK.half + 1, south], [HUB.maxX - 0.6, south], { y: FLOOR_Y, outward: [0, 1] });

  group.add(createNeck());
  return group;
}

/** The dark ramp-shaped neck from the hub's south edge down to the runway lane, with light edge lines. */
function createNeck() {
  const group = new THREE.Group();
  const top = FLOOR_Y + 0.15;
  const thickness = DEPTH;
  // Shape in (x, -z), extruded upward after rotateX(-PI/2) maps shape-y to -z and depth to +y.
  const points = [
    [-NECK.topHalf, NECK.topZ], [NECK.topHalf, NECK.topZ], [NECK.half, NECK.shoulderZ],
    [NECK.half, NECK.bottomZ], [-NECK.half, NECK.bottomZ], [-NECK.half, NECK.shoulderZ],
  ];
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  addMesh(group, geometry, standard(PLATFORM.neck, { roughness: 0.45, metalness: 0.1 }), { position: [0, top - thickness, 0] });

  // Light lines along the angled shoulders.
  const edge = standard(PLATFORM.laneEdge, { roughness: 0.4, emissive: PLATFORM.laneEdge, emissiveIntensity: 0.35 });
  for (const sign of [-1, 1]) {
    const a = [sign * NECK.topHalf, NECK.topZ];
    const b = [sign * NECK.half, NECK.shoulderZ];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    box(group, [length, 0.08, 0.5], edge, {
      position: [(a[0] + b[0]) / 2, top + 0.04, (a[1] + b[1]) / 2],
      rotation: [0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0],
      cast: false,
    });
  }
  return group;
}

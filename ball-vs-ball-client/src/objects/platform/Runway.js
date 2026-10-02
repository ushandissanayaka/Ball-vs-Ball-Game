import * as THREE from 'three';
import { DECK_THICKNESS, FLOOR_Y, NECK, RUNWAY } from '../../config/layout.js';
import { PLATFORM } from '../../config/palette.js';
import { standard } from '../../util/materials.js';
import { addMesh, box } from '../../util/mesh.js';
import { deckFaces, glassDeck, insetLine } from './platformMaterials.js';

const DEPTH = DECK_THICKNESS;
const LANE_Y = FLOOR_Y - 0.1;
const CHEVRON_STEP = 6;
const RIM = 1.6; // dark lip along the decks' outer and south edges
const INSET = 3.5; // light inset line inside each deck

/**
 * The runway south of the hub, as in the top-down reference shots:
 * - two glass decks carrying the arenas; neon only on the edge facing the hub, a dark lip on the others and a
 *   thin light inset line all round;
 * - a dark lane between them that runs on past the decks as a glowing tab (the red ball sits at its end);
 * - a darker chevron strip down the lane's middle, flanked near the hub by two lighter glass panels whose far
 *   ends are cut on a slant.
 */
export function createRunway(neon) {
  const group = new THREE.Group();
  group.name = 'runway';
  const { startZ, endZ, laneHalf, outerX, tab, stripHalf } = RUNWAY;
  const length = endZ - startZ;
  const midZ = (startZ + endZ) / 2;
  const deckWidth = outerX - laneHalf;
  const lip = standard(PLATFORM.side, { roughness: 0.5 });
  const line = insetLine();

  for (const sign of [-1, 1]) {
    const centerX = (sign * (laneHalf + outerX)) / 2;
    addMesh(group, new THREE.BoxGeometry(deckWidth, DEPTH, length), deckFaces(), { position: [centerX, FLOOR_Y - DEPTH / 2, midZ] });
    // Neon all round the deck's open edges (north, outer, south), so the whole stage outline glows; a dark lip
    // just inside it on the outer and south edges.
    const edgeX = sign * (outerX - 0.6);
    neon.segment([sign * laneHalf, startZ + 0.6], [edgeX, startZ + 0.6], { y: FLOOR_Y, outward: [0, -1] });
    neon.segment([edgeX, startZ + 0.6], [edgeX, endZ - 0.6], { y: FLOOR_Y, outward: [sign, 0] });
    neon.segment([sign * laneHalf, endZ - 0.6], [edgeX, endZ - 0.6], { y: FLOOR_Y, outward: [0, 1] });
    const glowWidth = 1.2;
    box(group, [RIM, 0.35, length - glowWidth * 2], lip, { position: [sign * (outerX - glowWidth - RIM / 2), FLOOR_Y + 0.18, midZ] });
    box(group, [deckWidth - glowWidth, 0.35, RIM], lip, {
      position: [centerX - (sign * glowWidth) / 2, FLOOR_Y + 0.18, endZ - glowWidth - RIM / 2],
    });
    // Inset line.
    const [x0, x1] = [sign * (laneHalf + INSET), sign * (outerX - glowWidth - RIM - INSET)];
    const [z0, z1] = [startZ + INSET, endZ - glowWidth - RIM - INSET];
    const y = FLOOR_Y + 0.03;
    box(group, [Math.abs(x1 - x0), 0.06, 0.45], line, { position: [(x0 + x1) / 2, y, z0], cast: false });
    box(group, [Math.abs(x1 - x0), 0.06, 0.45], line, { position: [(x0 + x1) / 2, y, z1], cast: false });
    box(group, [0.45, 0.06, z1 - z0], line, { position: [x0, y, (z0 + z1) / 2], cast: false });
    box(group, [0.45, 0.06, z1 - z0], line, { position: [x1, y, (z0 + z1) / 2], cast: false });
  }

  // Lane, running on past the decks as the tab.
  const laneLength = length + tab;
  const laneMid = startZ + laneLength / 2;
  const lane = standard(PLATFORM.lane, { roughness: 0.45, metalness: 0.1 });
  addMesh(group, new THREE.BoxGeometry(laneHalf * 2, DEPTH, laneLength), lane, { position: [0, LANE_Y - DEPTH / 2, laneMid] });
  box(group, [stripHalf * 2, 0.04, laneLength - 2], standard(PLATFORM.laneCenter, { roughness: 0.35, metalness: 0.15 }), {
    position: [0, LANE_Y + 0.02, laneMid], cast: false,
  });
  const edge = standard(PLATFORM.laneEdge, { roughness: 0.4, emissive: PLATFORM.laneEdge, emissiveIntensity: 0.35 });
  for (const sign of [-1, 1]) {
    box(group, [0.7, 0.3, length], edge, { position: [sign * (laneHalf - 0.35), FLOOR_Y + 0.05, midZ], cast: false });
  }
  // Neon around the tab's three open edges.
  const tabEnd = endZ + tab;
  neon.segment([-laneHalf + 0.6, tabEnd - 0.6], [laneHalf - 0.6, tabEnd - 0.6], { y: LANE_Y, outward: [0, 1] });
  neon.segment([-laneHalf + 0.6, endZ], [-laneHalf + 0.6, tabEnd - 0.6], { y: LANE_Y, outward: [-1, 0] });
  neon.segment([laneHalf - 0.6, endZ], [laneHalf - 0.6, tabEnd - 0.6], { y: LANE_Y, outward: [1, 0] });

  group.add(createLanePanels(), createChevrons());
  return group;
}

/** The two lighter glass panels either side of the chevron strip near the hub, far ends cut on one slant. */
function createLanePanels() {
  const group = new THREE.Group();
  const { startZ, laneHalf, stripHalf, panelLength } = RUNWAY;
  const near = NECK.bottomZ + 1;
  const slant = 9; // how much further south the panels reach at their east side than at their west side
  const farAt = (x) => startZ + panelLength + ((x + laneHalf) / (laneHalf * 2)) * slant;
  const outline = standard(PLATFORM.insetLine, { roughness: 0.3, emissive: PLATFORM.insetLine, emissiveIntensity: 0.45 });
  for (const [x0, x1] of [[-laneHalf + 2, -stripHalf - 1], [stripHalf + 1, laneHalf - 2]]) {
    const corners = [[x0, near], [x1, near], [x1, farAt(x1)], [x0, farAt(x0)]];
    const shape = new THREE.Shape(corners.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2); // shape-y (-z) back to world z
    addMesh(group, geometry, glassDeck(), { position: [0, LANE_Y + 0.05, 0], cast: false });
    corners.forEach(([ax, az], i) => {
      const [bx, bz] = corners[(i + 1) % corners.length];
      box(group, [Math.hypot(bx - ax, bz - az), 0.06, 0.4], outline, {
        position: [(ax + bx) / 2, LANE_Y + 0.08, (az + bz) / 2],
        rotation: [0, -Math.atan2(bz - az, bx - ax), 0],
        cast: false,
      });
    });
  }
  return group;
}

function chevronGeometry() {
  const outline = [[-2.4, -1.5], [0, 1.5], [2.4, -1.5], [1.35, -1.5], [0, 0.2], [-1.35, -1.5]];
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); // lies flat, pointing north (-z)
  return geometry;
}

/** Two columns of slim metallic chevrons down the strip: west column points north, east column south. */
function createChevrons() {
  const positions = [];
  for (let z = NECK.topZ + 4; z <= RUNWAY.endZ + RUNWAY.tab - 8; z += CHEVRON_STEP) {
    const y = z < NECK.bottomZ ? FLOOR_Y + 0.17 : LANE_Y + 0.07;
    positions.push([-3, y, z, 0], [3, y, z, Math.PI]);
  }
  const material = standard(PLATFORM.chevron, { roughness: 0.45, metalness: 0.3, emissive: '#8fa9d8', emissiveIntensity: 0.3 });
  const mesh = new THREE.InstancedMesh(chevronGeometry(), material, positions.length);
  const dummy = new THREE.Object3D();
  positions.forEach(([x, y, z, turn], index) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, turn, 0);
    dummy.scale.set(0.75, 1, 1.5);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.receiveShadow = true;
  mesh.name = 'chevrons';
  return mesh;
}

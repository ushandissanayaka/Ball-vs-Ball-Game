import * as THREE from 'three';
import { CONVEYOR, DECK_THICKNESS, FLOOR_Y, NECK, RUNWAY } from '../../config/layout.js';
import { PLATFORM } from '../../config/palette.js';
import { canvasTexture } from '../../util/canvasText.js';
import { standard } from '../../util/materials.js';
import { addMesh, box } from '../../util/mesh.js';
import { deckFaces, glassDeck, insetLine } from './platformMaterials.js';

const DEPTH = DECK_THICKNESS;
const LANE_Y = FLOOR_Y - 0.1;
const RIM = 1.6; // dark lip along the decks' outer and south edges
const INSET = 3.5; // light inset line inside each deck

/**
 * The runway south of the hub, as in the top-down reference shots:
 * - two glass decks carrying the arenas; neon only on the edge facing the hub, a dark lip on the others and a
 *   thin light inset line all round;
 * - a dark lane between them that runs on past the decks as a glowing tab (the red ball sits at its end);
 * - two conveyor strips down the lane's middle, their chevrons scrolling the way they point (toward the hub on
 *   the west strip, away from it on the east), flanked near the hub by two lighter glass panels whose far ends
 *   are cut on a slant.
 * `group.userData.animate(seconds)` scrolls the chevrons; `group.userData.animatedBounds` is the box they move in.
 */
export function createRunway(neon) {
  const group = new THREE.Group();
  group.name = 'runway';
  const { startZ, endZ, laneHalf, outerX, tab } = RUNWAY;
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
  const edge = standard(PLATFORM.laneEdge, { roughness: 0.4, emissive: PLATFORM.laneEdge, emissiveIntensity: 0.35 });
  for (const sign of [-1, 1]) {
    box(group, [0.7, 0.3, length], edge, { position: [sign * (laneHalf - 0.35), FLOOR_Y + 0.05, midZ], cast: false });
  }
  // Neon around the tab's three open edges.
  const tabEnd = endZ + tab;
  neon.segment([-laneHalf + 0.6, tabEnd - 0.6], [laneHalf - 0.6, tabEnd - 0.6], { y: LANE_Y, outward: [0, 1] });
  neon.segment([-laneHalf + 0.6, endZ], [-laneHalf + 0.6, tabEnd - 0.6], { y: LANE_Y, outward: [-1, 0] });
  neon.segment([laneHalf - 0.6, endZ], [laneHalf - 0.6, tabEnd - 0.6], { y: LANE_Y, outward: [1, 0] });

  const conveyors = createConveyors();
  group.add(createLanePanels(), conveyors.group);
  group.userData.animate = conveyors.animate;
  group.userData.animatedBounds = conveyors.bounds;
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

// One chevron repeat: the strip's width by `CONVEYOR.tile` long, at the same pixels per unit both ways.
const TILE_PX = { width: 128, height: Math.round((128 * CONVEYOR.tile) / (CONVEYOR.half * 2)) };

/**
 * One repeat of a conveyor strip's pattern, pointing up the canvas: the dark belt with a pair of tall, steep
 * chevrons one just behind the other, each brightest at its tip and fading out down its arms (as in the
 * reference), then a gap before the next pair.
 */
function paintConveyorTile() {
  const canvas = document.createElement('canvas');
  const { width: w, height: h } = TILE_PX;
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  c.fillStyle = PLATFORM.conveyor;
  c.fillRect(0, 0, w, h);
  const arrow = new THREE.Color(PLATFORM.conveyorArrow);
  const rgba = (alpha) => `rgba(${Math.round(arrow.r * 255)}, ${Math.round(arrow.g * 255)}, ${Math.round(arrow.b * 255)}, ${alpha})`;
  const rise = h * 0.56; // from the tip down to the arms' ends
  const thick = h * 0.2; // how thick each arm is, measured along the strip (the steep arms look a third of that)
  const edge = w * 0.03;
  const chevron = (top, strength) => {
    const fade = c.createLinearGradient(0, top, 0, top + rise + thick);
    fade.addColorStop(0, rgba(strength));
    fade.addColorStop(0.45, rgba(strength * 0.45));
    fade.addColorStop(1, rgba(0));
    c.fillStyle = fade;
    c.beginPath();
    c.moveTo(w / 2, top);
    c.lineTo(w - edge, top + rise);
    c.lineTo(w - edge, top + rise + thick);
    c.lineTo(w / 2, top + thick);
    c.lineTo(edge, top + rise + thick);
    c.lineTo(edge, top + rise);
    c.closePath();
    c.fill();
  };
  // Drawn a tile above and below too, so the pattern runs on seamlessly where the repeats meet.
  for (const shift of [-h, 0, h]) {
    chevron(shift + h * 0.04, 0.95);
    chevron(shift + h * 0.27, 0.6);
  }
  const texture = canvasTexture(canvas);
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8; // seen at a glancing angle down the runway
  return texture;
}

/** True when (x, z) is on conveyor strip `strip`. */
const onStrip = (strip, x, z) => Math.abs(x - strip.side * CONVEYOR.x) <= CONVEYOR.half && z >= CONVEYOR.fromZ && z <= CONVEYOR.toZ;

/** How fast a conveyor carries someone standing at (x, z), along z (units per second; 0 off the strips). */
export function conveyorPush(x, z) {
  const strip = CONVEYOR.strips.find((s) => onStrip(s, x, z));
  return strip ? strip.dir * CONVEYOR.speed : 0;
}

/**
 * The two conveyor strips: a dark belt a little proud of the lane, its top showing the chevron pattern. Both
 * tops share one texture; the east one is turned round, so scrolling it moves each strip's chevrons the way
 * they point.
 */
function createConveyors() {
  const group = new THREE.Group();
  const { x, half, fromZ, toZ, tile, speed } = CONVEYOR;
  const length = toZ - fromZ;
  const midZ = (fromZ + toZ) / 2;
  const top = FLOOR_Y + 0.05;
  const texture = paintConveyorTile();
  texture.repeat.set(1, length / tile);
  // Its own material (not a shared one from `standard`): the chevrons glow a little, as in the reference.
  const face = new THREE.MeshStandardMaterial({
    map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.22, roughness: 0.75, metalness: 0,
  });
  const belt = standard(PLATFORM.conveyor, { roughness: 0.75 });
  for (const strip of CONVEYOR.strips) {
    const cx = strip.side * x;
    box(group, [half * 2, top - LANE_Y, length], belt, { position: [cx, (LANE_Y + top) / 2, midZ], cast: false });
    const surface = new THREE.PlaneGeometry(half * 2, length);
    surface.rotateX(-Math.PI / 2); // the texture's up runs north (-z)
    if (strip.dir > 0) surface.rotateY(Math.PI); // pointing south
    addMesh(group, surface, face, { position: [cx, top + 0.01, midZ], cast: false });
  }
  group.name = 'conveyors';
  const bounds = new THREE.Box3(new THREE.Vector3(-x - half, LANE_Y, fromZ), new THREE.Vector3(x + half, top + 0.1, toZ));
  // Moving the pattern toward its tips: the offset runs backwards, wrapped to stay small.
  const animate = (seconds) => { texture.offset.y = -(((seconds * speed) / tile) % 1); };
  return { group, animate, bounds };
}

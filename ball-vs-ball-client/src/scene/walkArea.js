import * as THREE from 'three';
import { FLOOR_Y, HUB, NECK, RUNWAY } from '../config/layout.js';

const EDGE = 1.4; // keep this far inside the deck edge (the neon)

/**
 * Where the player character may walk: the hub, the neck and the runway (decks, lane and the tab at its end).
 * Props are round obstacles it slides round; arena bases are low steps it walks up onto.
 */
export function createWalkArea() {
  // Each floor keeps EDGE inside its open edges only: where one floor joins the next (hub to neck, neck to
  // runway, runway to the tab) they overlap instead, so there is no unwalkable seam between them.
  const JOIN = EDGE * 2;
  const floors = [
    [HUB.minX + EDGE, HUB.minZ + EDGE, HUB.maxX - EDGE, HUB.maxZ - EDGE],
    [-NECK.half + EDGE, NECK.topZ, NECK.half - EDGE, RUNWAY.startZ + JOIN],
    [-RUNWAY.outerX + EDGE, RUNWAY.startZ + EDGE, RUNWAY.outerX - EDGE, RUNWAY.endZ - EDGE],
    [-RUNWAY.laneHalf + EDGE, RUNWAY.endZ - JOIN, RUNWAY.laneHalf - EDGE, RUNWAY.endZ + RUNWAY.tab - EDGE],
  ];
  const obstacles = []; // { x, z, r }
  const steps = []; // { inverse: Matrix4 (world to the step's own space), halfX, halfZ, height }

  const onFloor = (x, z) => floors.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const blocked = (x, z, radius) => obstacles.some((o) => (x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + radius) ** 2);
  const local = new THREE.Vector3();

  return {
    /** A round obstacle at `object`'s local point [x, z] (or its origin). */
    addObstacle(object, r, [lx, lz] = [0, 0]) {
      object.updateMatrixWorld(true);
      const p = object.localToWorld(new THREE.Vector3(lx, 0, lz));
      obstacles.push({ x: p.x, z: p.z, r });
    },
    /** A box-shaped step (its own space centred on `object`), `height` above the floor. */
    addStep(object, halfX, halfZ, height) {
      object.updateMatrixWorld(true);
      steps.push({ inverse: object.matrixWorld.clone().invert(), halfX, halfZ, height });
    },
    /** Floor height at (x, z). */
    groundAt(x, z) {
      for (const step of steps) {
        local.set(x, FLOOR_Y, z).applyMatrix4(step.inverse);
        if (Math.abs(local.x) <= step.halfX && Math.abs(local.z) <= step.halfZ) return FLOOR_Y + step.height;
      }
      return FLOOR_Y;
    },
    /** Moves `position` by (dx, dz) as far as the floor and the obstacles allow, sliding along them. */
    move(position, dx, dz, radius) {
      const tryTo = (x, z) => onFloor(x, z) && !blocked(x, z, radius);
      if (tryTo(position.x + dx, position.z + dz)) {
        position.x += dx;
        position.z += dz;
      } else if (tryTo(position.x + dx, position.z)) {
        position.x += dx;
      } else if (tryTo(position.x, position.z + dz)) {
        position.z += dz;
      }
    },
  };
}

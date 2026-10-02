import * as THREE from 'three';
import { DECK_THICKNESS, FLOOR_Y, SUPPORTS } from '../../config/layout.js';
import { PLATFORM } from '../../config/palette.js';
import { standard } from '../../util/materials.js';
import { block } from '../../util/mesh.js';

/** The dark blocks hanging under the floating deck (under each arena and the hub), casting shadows on the sea. */
export function createSupportBlocks() {
  const group = new THREE.Group();
  group.name = 'supports';
  const material = standard(PLATFORM.underside, { roughness: 0.6 });
  const top = FLOOR_Y - DECK_THICKNESS;
  for (const [x, z, width, depth] of SUPPORTS.blocks) {
    block(group, [width, SUPPORTS.drop, depth], material, { position: [x, top - SUPPORTS.drop, z] });
  }
  return group;
}

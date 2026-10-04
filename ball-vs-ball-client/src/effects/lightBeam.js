import * as THREE from 'three';
import { CAMERA } from '../config/layout.js';
import { mulberry32 } from '../util/random.js';
import { createBillboardCloud } from './billboards.js';
import { additive, dotTexture, fadeTexture } from './glowTextures.js';

/**
 * A projector's light cone: starts at the origin and widens along +z for `length` units. Static (no animation),
 * additive, so it brightens whatever is behind it like a real beam in hazy air.
 */
export function createLightBeam({ length = 20, radius = 7, color = '#f2e9ff', opacity = 0.35 } = {}) {
  const group = new THREE.Group();
  const cone = new THREE.ConeGeometry(radius, length, 32, 1, true);
  // Cone tip is at +y (where the fade texture is brightest); turn it to point back at the lens.
  cone.rotateX(-Math.PI / 2);
  cone.translate(0, 0, length / 2);
  const beam = new THREE.Mesh(cone, additive(fadeTexture(), color, opacity));
  beam.renderOrder = 3;
  group.add(beam);
  return group;
}

/** A small cloud of still sparkles around `center` (for the projector's "explosion"). */
export function createSparkles({ count = 26, spread = 4, size = 1.4, color = '#ffffff', seed = 3, map = dotTexture() } = {}) {
  const rand = mulberry32(seed);
  // `size` is in a PointsMaterial's units (what these once were): the billboards come out the same size.
  const cloud = createBillboardCloud(count, { map, color, size: size * Math.tan(THREE.MathUtils.degToRad(CAMERA.fov) / 2), bounds: spread * 1.5 });
  for (let i = 0; i < count; i += 1) {
    cloud.offsets[i * 3] = (rand() - 0.5) * spread * 2;
    cloud.offsets[i * 3 + 1] = (rand() - 0.5) * spread * 1.4;
    cloud.offsets[i * 3 + 2] = (rand() - 0.5) * spread * 2;
  }
  cloud.commit();
  cloud.mesh.renderOrder = 4;
  return cloud.mesh;
}

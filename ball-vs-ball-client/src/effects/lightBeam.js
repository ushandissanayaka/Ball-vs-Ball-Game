import * as THREE from 'three';
import { mulberry32 } from '../util/random.js';
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
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (rand() - 0.5) * spread * 2;
    positions[i * 3 + 1] = (rand() - 0.5) * spread * 1.4;
    positions[i * 3 + 2] = (rand() - 0.5) * spread * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 4;
  return points;
}

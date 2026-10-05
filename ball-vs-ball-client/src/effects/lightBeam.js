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

/** A beam's glow across its width: bright in the middle, fading to nothing at the edges; along its length, it
 *  fades a little from the lens and out to nothing at its far end. */
let beamTexture = null;
function projectorBeamTexture() {
  if (beamTexture) return beamTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  const image = c.createImageData(64, 128);
  for (let y = 0; y < 128; y += 1) {
    const along = y / 127; // 0 at the lens, 1 where it lands
    // Bright from the lens, fading out over the last stretch so the open end never shows as a rim.
    const strength = (0.8 - along * 0.3) * Math.min(1, (1 - along) / 0.25);
    for (let x = 0; x < 64; x += 1) {
      const across = Math.abs(x / 63 - 0.5) * 2; // 0 middle, 1 edge (round the cone's side)
      const v = Math.max(0, strength * (1 - across ** 1.6)) * 255;
      const i = (y * 64 + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  c.putImageData(image, 0, 0);
  beamTexture = new THREE.CanvasTexture(canvas);
  beamTexture.wrapS = THREE.RepeatWrapping;
  return beamTexture;
}

/**
 * A projector's beam as a solid-looking shaft of light, from the origin along +z for `length`, widening to
 * `radius`: three nested cones (a bright core and softer outer layers, each brightest along its middle), so it
 * reads as a 3D volume from any side, plus tiny specks streaming along it to where it lands. Additive; costs four
 * draws. `group.userData.update(seconds)` moves the specks.
 */
export function createProjectorBeam(length, radius, color = '#f2e9ff') {
  const group = new THREE.Group();
  for (const [scale, opacity] of [[1, 0.16], [0.7, 0.22], [0.38, 0.32]]) {
    const cone = new THREE.ConeGeometry(radius * scale, length, 40, 1, true);
    cone.rotateX(-Math.PI / 2);
    cone.translate(0, 0, length / 2);
    const material = additive(projectorBeamTexture(), color, opacity);
    material.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(cone, material);
    mesh.renderOrder = 3;
    group.add(mesh);
  }
  // Tiny specks streaming along the light, from the lens into the bubble: each rides its own line through the cone
  // at its own speed, fading in at the lens and out where the beam ends. One draw; `update(seconds)` moves them.
  const rand = mulberry32(17);
  const count = 46;
  const specks = Array.from({ length: count }, () => ({
    phase: rand(), speed: 0.35 + rand() * 0.45, angle: rand() * Math.PI * 2, out: Math.sqrt(rand()) * 0.8,
    white: rand() < 0.35,
  }));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: dotTexture(), size: 0.75, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  points.frustumCulled = false;
  points.renderOrder = 4;
  group.add(points);
  const violet = new THREE.Color('#d8b8ff');
  const cyan = new THREE.Color('#9ffcff');
  group.userData.update = (seconds) => {
    specks.forEach((speck, i) => {
      const t = (speck.phase + seconds * speck.speed * (8 / length)) % 1; // 0 at the lens, 1 at the far end
      const r = radius * t * speck.out;
      const a = speck.angle + t * 1.5; // a slight spiral as they travel
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = length * t;
      const fade = Math.min(1, t / 0.12, (1 - t) / 0.15);
      const tint = speck.white ? cyan : violet;
      colors[i * 3] = Math.min(1, tint.r * fade * 1.4);
      colors[i * 3 + 1] = Math.min(1, tint.g * fade * 1.4);
      colors[i * 3 + 2] = Math.min(1, tint.b * fade * 1.4);
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  };
  group.userData.update(0);
  return group;
}

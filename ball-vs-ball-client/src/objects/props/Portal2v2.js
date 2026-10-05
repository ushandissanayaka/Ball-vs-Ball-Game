import * as THREE from 'three';
import { LABEL, NEON, PROP } from '../../config/palette.js';
import { additive, dotTexture, fadeTexture } from '../../effects/glowTextures.js';
import { createLabel, stationLines } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box } from '../../util/mesh.js';

/**
 * The 2V2 queue booth: a round glowing pad, a glass booth between two dark pillars, two bright orbs clashing inside
 * it (throwing out magic dust) and a column of light rising from the pad. `group.userData.update(seconds)` plays it.
 */
export function createPortal2v2() {
  const group = new THREE.Group();
  group.name = 'portal-2v2';
  const dark = standard(PROP.pillar, { roughness: 0.4, metalness: 0.3 });

  addMesh(group, new THREE.CylinderGeometry(7.6, 8, 0.9, 48), standard('#26365f', { roughness: 0.35, metalness: 0.2 }), { position: [0, 0.45, 0] });
  addMesh(group, new THREE.TorusGeometry(6.9, 0.32, 8, 64), glow(NEON.cyan, 1.8), { position: [0, 0.95, 0], rotation: [-Math.PI / 2, 0, 0], cast: false });
  addMesh(group, new THREE.CylinderGeometry(5.6, 5.6, 0.2, 48), glow('#c4f5ff', 1.5), { position: [0, 1, 0], cast: false });

  for (const x of [-6.4, 6.4]) block(group, [1.7, 17.5, 2], dark, { position: [x, 0.9, -0.5] });
  block(group, [14.5, 1.6, 2.4], dark, { position: [0, 18.2, -0.5] });
  block(group, [11, 0.6, 7], dark, { position: [0, 17.6, -0.5] });
  // Bright edges down the front of the glass.
  for (const x of [-5.4, 5.4]) box(group, [0.35, 16.4, 0.35], glow(NEON.white, 1.4), { position: [x, 9.4, 2.9], cast: false });

  const glass = new THREE.MeshStandardMaterial({
    color: '#9fe4ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.6,
  });
  addMesh(group, new THREE.BoxGeometry(11, 16.6, 7), glass, { position: [0, 9.6, -0.5], cast: false, receive: false }).renderOrder = 1;

  // Light column: bright at the pad, fading upward.
  const column = new THREE.CylinderGeometry(4.6, 5.2, 15, 32, 1, true);
  column.rotateX(Math.PI); // fade texture is brightest at the top; flip it so it is brightest at the bottom
  addMesh(group, column, additive(fadeTexture(), NEON.cyan, 0.55), { position: [0, 8.5, -0.5], cast: false, receive: false }).renderOrder = 2;

  const show = createClashingOrbs();
  group.add(show.group);

  const label = createLabel(stationLines('2V2', LABEL.station), { worldHeight: 6 });
  label.position.set(0, 23.5, 0);
  group.add(label);
  group.userData.update = show.update;
  return group;
}

/** A four-point sparkle with a soft glow, white (tinted per mote). */
let sparkle = null;
function sparkleTexture() {
  if (sparkle) return sparkle;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d');
  const glowFill = c.createRadialGradient(32, 32, 0, 32, 32, 30);
  glowFill.addColorStop(0, 'rgba(255,255,255,1)');
  glowFill.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  glowFill.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = glowFill;
  c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(32, 2); c.lineTo(36, 28); c.lineTo(62, 32); c.lineTo(36, 36); c.lineTo(32, 62); c.lineTo(28, 36); c.lineTo(2, 32); c.lineTo(28, 28);
  c.closePath();
  c.fill();
  sparkle = new THREE.CanvasTexture(canvas);
  sparkle.colorSpace = THREE.SRGBColorSpace;
  return sparkle;
}

const ORB = { radius: 1.75, speed: 9 };
// Where the orbs' centres may go: inside the glass (11 wide, from the pad to under the roof, 7 deep), less a radius.
const ROOM = { x: 5.4 - ORB.radius, yMin: 1.3 + ORB.radius, yMax: 16.8 - ORB.radius, zMin: -3.9 + ORB.radius, zMax: 2.9 - ORB.radius };
const DUST = 70;

/**
 * Two bright orbs (the booth's own white and cyan glow) flying freely about inside the glass, bouncing off its
 * walls, floor and roof; whenever they run into each other they bounce apart and throw out a puff of glittering
 * magic dust that drifts up and fades. Two spheres and a box: a handful of sums a frame. `update(seconds)` poses it all from the time alone; the dust is one draw, and a frame costs a little arithmetic.
 */
function createClashingOrbs() {
  const group = new THREE.Group();
  group.userData.dynamic = true; // it moves: keep it out of the lobby's static batching
  const orbMaterial = glow('#eafcff', 1.9);
  const orbs = [-1, 1].map((side) => {
    const orb = new THREE.Group();
    addMesh(orb, new THREE.SphereGeometry(ORB.radius, 24, 16), orbMaterial, { cast: false });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: NEON.cyan, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.setScalar(8);
    orb.add(halo);
    orb.userData.side = side;
    group.add(orb);
    return orb;
  });
  // The flash where they meet.
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
  flash.position.set(0, ORB.y, ORB.z);
  flash.renderOrder = 4;
  group.add(flash);

  // Magic dust: each mote has its own direction, speed, twinkle and colour (white to cyan), all fixed up front.
  const seeds = Array.from({ length: DUST }, (_, i) => {
    const a = Math.random() * Math.PI * 2;
    const up = Math.random() * 2 - 0.6;
    const speed = 5 + Math.random() * 6;
    return { dx: Math.cos(a) * speed, dy: up * speed * 0.7, dz: Math.sin(a) * speed * 0.55, twinkle: Math.random() * 6, i };
  });
  const positions = new Float32Array(DUST * 3);
  const colors = new Float32Array(DUST * 3);
  const white = new THREE.Color('#ffffff');
  const cyan = new THREE.Color('#00a8ff');
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
    // Drawn over the bright glass, so normal (not additive) blending: saturated cyan motes and white sparkles.
    map: sparkleTexture(), size: 2.4, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false,
  }));
  dust.frustumCulled = false;
  dust.renderOrder = 4; // over the glass and the light column
  group.add(dust);
  const tint = new THREE.Color();

  // The orbs fly at a steady speed in different directions to start with.
  const velocities = [new THREE.Vector3(1, 0.7, 0.35), new THREE.Vector3(-0.8, -0.6, -0.4)].map((v) => v.normalize().multiplyScalar(ORB.speed));
  orbs[0].position.set(-2.5, 6, 0);
  orbs[1].position.set(2.5, 11, -1);
  const burst = new THREE.Vector3(0, 6, 0); // where they last met
  let lastHit = -10;
  let last = null;
  const normal = new THREE.Vector3();
  const relative = new THREE.Vector3();
  const bounceOffWalls = (orb, velocity) => {
    const pos = orb.position;
    for (const [axis, min, max] of [['x', -ROOM.x, ROOM.x], ['y', ROOM.yMin, ROOM.yMax], ['z', ROOM.zMin, ROOM.zMax]]) {
      if (pos[axis] < min) { pos[axis] = min; velocity[axis] = Math.abs(velocity[axis]); }
      if (pos[axis] > max) { pos[axis] = max; velocity[axis] = -Math.abs(velocity[axis]); }
    }
  };

  const update = (seconds) => {
    const dt = last === null ? 0 : Math.min(0.05, Math.max(0, seconds - last)); // a long pause doesn't fling them
    last = seconds;
    for (let i = 0; i < 2; i += 1) {
      orbs[i].position.addScaledVector(velocities[i], dt);
      bounceOffWalls(orbs[i], velocities[i]);
    }
    // Do they touch? Bounce apart along the line between them, and burst the dust where they met.
    normal.subVectors(orbs[1].position, orbs[0].position);
    const distance = normal.length();
    if (distance < ORB.radius * 2 && distance > 1e-4) {
      normal.divideScalar(distance);
      const closing = relative.subVectors(velocities[0], velocities[1]).dot(normal);
      if (closing > 0) {
        velocities[0].addScaledVector(normal, -closing);
        velocities[1].addScaledVector(normal, closing);
        burst.addVectors(orbs[0].position, orbs[1].position).multiplyScalar(0.5);
        lastHit = seconds;
      }
      const push = (ORB.radius * 2 - distance) / 2;
      orbs[0].position.addScaledVector(normal, -push);
      orbs[1].position.addScaledVector(normal, push);
      // Keep them lively: back to cruising speed, with a little twist so their paths never settle into a loop.
      for (const v of velocities) v.applyAxisAngle(normal, 0.6).setLength(ORB.speed);
    }
    const age = seconds - lastHit;
    const squash = Math.max(0, 1 - age / 0.15) * 0.16;
    for (const orb of orbs) orb.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
    const flashLeft = Math.max(0, 1 - age / 0.25);
    flash.position.copy(burst);
    flash.material.opacity = flashLeft;
    flash.visible = flashLeft > 0;
    flash.scale.setScalar(3 + (1 - flashLeft) * 7);
    const life = Math.max(0, 1 - age / 1.5);
    dust.visible = life > 0;
    if (!dust.visible) return;
    for (const seed of seeds) {
      const k = seed.i * 3;
      const drift = age * (1 - age * 0.3);
      positions[k] = burst.x + seed.dx * drift;
      positions[k + 1] = burst.y + seed.dy * drift + age * age * 1.2; // the dust floats up as it slows
      positions[k + 2] = burst.z + seed.dz * drift;
      const shine = 0.75 + 0.25 * Math.sin(seconds * 14 + seed.twinkle);
      tint.copy(white).lerp(cyan, seed.i % 4 === 0 ? 0.15 : 1).multiplyScalar(shine); // mostly blue, some white
      colors[k] = tint.r;
      colors[k + 1] = tint.g;
      colors[k + 2] = tint.b;
    }
    dust.material.opacity = life;
    dustGeometry.attributes.position.needsUpdate = true;
    dustGeometry.attributes.color.needsUpdate = true;
  };
  update(0);
  return { group, update };
}

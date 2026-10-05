import * as THREE from 'three';
import { LABEL, PROP } from '../../config/palette.js';
import { createProjectorBeam } from '../../effects/lightBeam.js';
import { additive, dotTexture } from '../../effects/glowTextures.js';
import { canvasTexture, createLabel, stationLines } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box } from '../../util/mesh.js';

/** The TV screen picture: a pink-white flower burst on violet, with a cyan four-point sparkle. */
function screenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createRadialGradient(128, 128, 10, 128, 128, 170);
  bg.addColorStop(0, '#f6d9ff');
  bg.addColorStop(0.45, '#b46ae6');
  bg.addColorStop(1, '#4e2391');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.translate(128, 128);
  for (let i = 0; i < 8; i += 1) {
    ctx.rotate(Math.PI / 4);
    const petal = ctx.createLinearGradient(0, 0, 0, -78);
    petal.addColorStop(0, 'rgba(255,255,255,0.95)');
    petal.addColorStop(1, 'rgba(255,170,230,0.15)');
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.ellipse(0, -42, 15, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#7ff3ff';
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 ? 7 : 34;
    const a = (i * Math.PI) / 4;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  return canvasTexture(canvas);
}

/**
 * "Explosions": a purple CRT TV on a plinth, projecting a cone of light (toward the Balls machine) that ends in a
 * glowing bubble with an atom whirling inside it. `group.userData.update(seconds)` plays the atom.
 */
export function createExplosionsProjector() {
  const group = new THREE.Group();
  group.name = 'explosions';
  block(group, [10, 1.2, 9], standard(PROP.plinth, { roughness: 0.5 }));

  const body = standard(PROP.tvBody, { roughness: 0.4, metalness: 0.1 });
  const dark = standard(PROP.tvDark, { roughness: 0.5 });
  block(group, [7.4, 5.8, 5.6], body, { position: [0, 1.2, 0] });
  block(group, [5.4, 0.6, 3], dark, { position: [0, 7, -0.6] });
  // Screen, set into the front of the cabinet.
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.3), new THREE.MeshBasicMaterial({ map: screenTexture() }));
  screen.position.set(-0.3, 4.1, 2.82);
  group.add(screen);
  box(group, [0.7, 0.7, 0.2], glow('#ff3344', 1.3), { position: [2.9, 1.9, 2.86], cast: false });
  // Antenna and lens.
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), dark, { position: [-1.2, 8.9, -0.6], rotation: [0, 0, 0.6] });
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8), dark, { position: [1.1, 8.6, -0.6], rotation: [0, 0, -0.45] });
  addMesh(group, new THREE.SphereGeometry(0.35, 12, 8), dark, { position: [-2.95, 10.6, -0.6] });

  // Where the beam lands: a soft glowing bubble with an atom inside, as in the reference.
  const burstAt = new THREE.Vector3(-0.3, 6, 22);
  // The beam: from the screen straight onto the bubble, widening to cover it; a 3D shaft of light (see
  // createProjectorBeam), aimed by turning its +z toward the bubble.
  const lens = new THREE.Vector3(-0.3, 4.1, 2.9);
  // It ends inside the bubble, where its open end hides in the bubble's glow.
  const beam = createProjectorBeam(lens.distanceTo(burstAt) - 1.5, 3.8);
  beam.position.copy(lens);
  beam.lookAt(burstAt.clone());
  group.add(beam);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 20), additive(null, '#9dffe0', 0.06));
  bubble.position.copy(burstAt);
  bubble.renderOrder = 3;
  group.add(bubble);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: '#7dffd2', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.45,
  }));
  glowSprite.scale.setScalar(13);
  glowSprite.position.copy(burstAt);
  group.add(glowSprite);
  // Inside the bubble: an atom, its electrons whirling round the nucleus, and tiny particles darting about and
  // knocking into each other.
  const atom = createAtom(4.2);
  atom.group.position.copy(burstAt);
  group.add(atom.group);

  const label = createLabel(stationLines('Explosions', LABEL.station), { worldHeight: 4.2 });
  label.position.set(0, 13, 1);
  group.add(label);
  group.userData.update = (seconds) => {
    atom.update(seconds);
    beam.userData.update(seconds);
  };
  return group;
}

const ATOM_GREEN = '#5dffa8';
const ATOM_CYAN = '#7ff3ff';

/**
 * An atom in a bubble of radius `R`: a glowing nucleus of a few packed balls, three electrons racing round tilted
 * orbits (the orbits themselves not drawn), and `PARTICLES` tiny specks flying about inside the bubble, bouncing
 * off its wall and off each other, flaring white when they collide. All of it poses from the time; the specks are
 * one draw. `update(seconds)`.
 */
const PARTICLES = 14;
function createAtom(R) {
  const group = new THREE.Group();
  group.userData.dynamic = true; // it moves: keep it out of the lobby's static batching

  // Nucleus: protons (green) and neutrons (cyan) packed in a little cluster, slowly turning.
  const nucleus = new THREE.Group();
  const packed = [[0, 0, 0], [0.55, 0.3, 0.1], [-0.5, 0.25, -0.2], [0.1, -0.55, 0.25], [-0.2, 0.1, 0.6], [0.3, 0.2, -0.55], [-0.35, -0.4, -0.3]];
  packed.forEach((at, i) => addMesh(nucleus, new THREE.SphereGeometry(0.45, 14, 10), glow(i % 2 ? ATOM_CYAN : ATOM_GREEN, 1.6), { position: at, cast: false }));
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: ATOM_GREEN, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.9 }));
  core.scale.setScalar(3.2);
  nucleus.add(core);
  group.add(nucleus);

  // Electrons on three tilted orbits.
  const orbitRadius = R * 0.72;
  const orbits = [[0, 0, 0.35, 2.4], [Math.PI / 3, 0.2, -0.9, -2.0], [-Math.PI / 3, -0.3, 1.1, 2.8]].map(([y, x, z, speed], i) => {
    const plane = new THREE.Group();
    plane.rotation.set(x, y, z);
    const electron = new THREE.Group();
    addMesh(electron, new THREE.SphereGeometry(0.32, 12, 8), glow('#ffffff', 2), { cast: false });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: ATOM_CYAN, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.setScalar(2.2);
    electron.add(halo);
    plane.add(electron);
    group.add(plane);
    return { plane, electron, speed, offset: i * 2.1 };
  });

  // Tiny specks darting about inside the bubble.
  const rand = (() => { let seed = 7; return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; })();
  const specks = Array.from({ length: PARTICLES }, () => {
    const pos = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(R);
    const vel = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).setLength(2.5 + rand() * 2.5);
    return { pos, vel, hit: -10 };
  });
  const positions = new Float32Array(PARTICLES * 3);
  const colors = new Float32Array(PARTICLES * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: dotTexture(), size: 0.9, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  points.frustumCulled = false;
  points.renderOrder = 4;
  group.add(points);
  const green = new THREE.Color(ATOM_GREEN);
  const white = new THREE.Color('#ffffff');
  const tint = new THREE.Color();
  const between = new THREE.Vector3();
  const limit = R * 0.92;
  const gap = 0.45; // specks this close have collided

  let last = null;
  const update = (seconds) => {
    const dt = last === null ? 0 : Math.min(0.05, Math.max(0, seconds - last));
    last = seconds;
    nucleus.rotation.set(seconds * 0.7, seconds * 1.1, 0);
    for (const { plane, electron, speed, offset } of orbits) {
      const a = seconds * speed + offset;
      electron.position.set(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius);
      plane.rotation.y += dt * 0.15; // the orbits themselves slowly precess
    }
    for (const speck of specks) {
      speck.pos.addScaledVector(speck.vel, dt);
      // Bounce off the bubble's inside: reflect the velocity about the wall's normal.
      const d = speck.pos.length();
      if (d > limit) {
        const n = speck.pos.clone().divideScalar(d);
        speck.vel.addScaledVector(n, -2 * speck.vel.dot(n));
        speck.pos.setLength(limit);
      }
    }
    for (let i = 0; i < PARTICLES; i += 1) {
      for (let j = i + 1; j < PARTICLES; j += 1) {
        const a = specks[i];
        const b = specks[j];
        between.subVectors(b.pos, a.pos);
        const d = between.length();
        if (d >= gap || d < 1e-4) continue;
        between.divideScalar(d);
        const closing = a.vel.dot(between) - b.vel.dot(between);
        if (closing <= 0) continue;
        a.vel.addScaledVector(between, -closing);
        b.vel.addScaledVector(between, closing);
        a.hit = b.hit = seconds;
      }
    }
    specks.forEach((speck, i) => {
      const k = i * 3;
      positions[k] = speck.pos.x;
      positions[k + 1] = speck.pos.y;
      positions[k + 2] = speck.pos.z;
      const flare = Math.max(0, 1 - (seconds - speck.hit) / 0.35); // white-hot just after a knock
      tint.copy(green).lerp(white, flare).multiplyScalar(0.8 + flare * 0.8);
      colors[k] = tint.r;
      colors[k + 1] = tint.g;
      colors[k + 2] = tint.b;
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  };
  update(0);
  return { group, update };
}

import * as THREE from 'three';
import { LABEL, PROP } from '../../config/palette.js';
import { createLightBeam, createSparkles } from '../../effects/lightBeam.js';
import { additive, dotTexture, starTexture } from '../../effects/glowTextures.js';
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

/** "Explosions": a purple CRT TV on a plinth, projecting a cone of light that ends in a burst of sparkles. */
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

  const beam = createLightBeam({ length: 22, radius: 7.5 });
  beam.position.set(-0.3, 4.1, 2.9);
  beam.rotation.x = 0.12; // aims a little down toward the floor
  group.add(beam);
  // Where the beam lands: a soft glowing bubble with a burst of green four-point stars, as in the reference.
  const burstAt = new THREE.Vector3(-0.3, 6, 22);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 20), additive(null, '#9dffe0', 0.12));
  bubble.position.copy(burstAt);
  bubble.renderOrder = 3;
  group.add(bubble);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: '#7dffd2', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.8,
  }));
  glowSprite.scale.setScalar(13);
  glowSprite.position.copy(burstAt);
  group.add(glowSprite);
  const stars = createSparkles({ count: 34, spread: 5, size: 2.2, color: '#5dffa8', map: starTexture(), seed: 9 });
  stars.position.copy(burstAt);
  group.add(stars);

  const label = createLabel(stationLines('Explosions', LABEL.station), { worldHeight: 4.2 });
  label.position.set(0, 13, 1);
  group.add(label);
  return group;
}

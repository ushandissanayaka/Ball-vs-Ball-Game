import * as THREE from 'three';
import { DUEL_FX } from '../config/palette.js';
import { numberTexture } from '../objects/duel/ballModels.js';
import { dotTexture, starTexture } from './glowTextures.js';
import { createParticleField, puffTexture, shardTexture } from './smokeParticles.js';

/** A jagged lightning bolt with a soft glow (white; tinted per use). */
let boltCanvasTexture = null;
function boltTexture() {
  if (boltCanvasTexture) return boltCanvasTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const points = [[20, 8], [58, 52], [40, 58], [96, 120], [70, 64], [88, 58], [48, 8]];
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
  ctx.closePath();
  ctx.fill();
  boltCanvasTexture = new THREE.CanvasTexture(canvas);
  return boltCanvasTexture;
}

/** A thin bright ring, for shock waves. */
let ringCanvasTexture = null;
function ringTexture() {
  if (ringCanvasTexture) return ringCanvasTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 40, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  ringCanvasTexture = new THREE.CanvasTexture(canvas);
  return ringCanvasTexture;
}

function spritePool(parent, count, makeMaterial) {
  return Array.from({ length: count }, () => {
    const sprite = new THREE.Sprite(makeMaterial());
    sprite.visible = false;
    sprite.renderOrder = 14;
    parent.add(sprite);
    return { sprite, age: 0, life: 0, data: {} };
  });
}

const take = (pool) => pool.find((item) => !item.sprite.visible) ?? pool.reduce((a, b) => (a.age / a.life > b.age / b.life ? a : b));

/**
 * The fight's effects, in the duel box's fight layer (simulation units, +z toward the camera): damage numbers
 * that pop and float up, sparks, lightning bolts and shock-wave rings. `update(dt)` moves them all; nothing
 * is created while the fight runs (fixed pools), so it never stutters.
 */
export function createFightFx(layer) {
  const numbers = spritePool(layer, 28, () => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
  const bolts = spritePool(layer, 10, () => new THREE.SpriteMaterial({ map: boltTexture(), color: '#9fe8ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  const rings = spritePool(layer, 8, () => new THREE.SpriteMaterial({ map: ringTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));

  // Sparks: one Points cloud, positions and colours rewritten each frame.
  const MAX_SPARKS = 220;
  const positions = new Float32Array(MAX_SPARKS * 3);
  const colors = new Float32Array(MAX_SPARKS * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sparkMaterial = new THREE.PointsMaterial({
    size: 0.32, map: starTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const sparkCloud = new THREE.Points(sparkGeometry, sparkMaterial);
  sparkCloud.frustumCulled = false;
  sparkCloud.renderOrder = 13;
  layer.add(sparkCloud);
  const sparks = [];
  const color = new THREE.Color();

  const spawnNumber = (text, fill, x, y, z) => {
    const item = take(numbers);
    const entry = numberTexture(text, fill, '#1a0505');
    // Only the first texture changes the shader (it then has a map); swapping textures after that is free.
    if (!item.sprite.material.map) item.sprite.material.needsUpdate = true;
    item.sprite.material.map = entry.texture;
    item.data = { x: x + (Math.random() - 0.5) * 6, y, z, aspect: entry.aspect };
    item.age = 0;
    item.life = 0.95;
    item.sprite.visible = true;
  };

  const spawnSparks = (x, y, z, tint, count = 10, speed = 40) => {
    color.set(tint).multiplyScalar(1.6);
    for (let i = 0; i < count; i += 1) {
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      sparks.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: (Math.random() - 0.3) * s * 0.4, age: 0, life: 0.25 + Math.random() * 0.3, r: color.r, g: color.g, b: color.b });
    }
  };

  const spawnBolt = (x, y, z) => {
    for (let i = 0; i < 2; i += 1) {
      const item = take(bolts);
      item.data = { x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, z: z + 2, size: 9 + Math.random() * 6 };
      item.sprite.material.rotation = Math.random() * Math.PI * 2;
      item.age = 0;
      item.life = 0.28;
      item.sprite.visible = true;
    }
  };

  const spawnRing = (x, y, z, tint, size = 30) => {
    const item = take(rings);
    item.sprite.material.color.set(tint);
    item.data = { x, y, z, size };
    item.age = 0;
    item.life = 0.45;
    item.sprite.visible = true;
  };

  const update = (dt) => {
    let active = false;
    for (const item of numbers) {
      if (!item.sprite.visible) continue;
      active = true;
      item.age += dt;
      const t = item.age / item.life;
      if (t >= 1) { item.sprite.visible = false; continue; }
      // Pop in big, settle, float up and fade.
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.7 : 1.3 - Math.min(1, (t - 0.15) / 0.2) * 0.3;
      const height = 11 * pop;
      item.sprite.position.set(item.data.x, item.data.y + t * 14, item.data.z + 6);
      item.sprite.scale.set(height * item.data.aspect, height, 1);
      item.sprite.material.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    }
    for (const pool of [bolts, rings]) {
      for (const item of pool) {
        if (!item.sprite.visible) continue;
        active = true;
        item.age += dt;
        const t = item.age / item.life;
        if (t >= 1) { item.sprite.visible = false; continue; }
        const size = pool === rings ? item.data.size * (0.3 + t * 0.9) : item.data.size;
        item.sprite.position.set(item.data.x, item.data.y, item.data.z);
        item.sprite.scale.set(size, size, 1);
        item.sprite.material.opacity = pool === bolts ? (Math.random() < 0.25 ? 0.2 : 1) * (1 - t) : 1 - t;
      }
    }
    let n = 0;
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];
      spark.age += dt;
      if (spark.age >= spark.life) { sparks.splice(i, 1); continue; }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.z += spark.vz * dt;
      spark.vx *= 0.9;
      spark.vy *= 0.9;
    }
    for (const spark of sparks) {
      const fade = 1 - spark.age / spark.life;
      positions.set([spark.x, spark.y, spark.z], n * 3);
      colors.set([spark.r * fade, spark.g * fade, spark.b * fade], n * 3);
      n += 1;
    }
    sparkGeometry.setDrawRange(0, n);
    sparkGeometry.attributes.position.needsUpdate = true;
    sparkGeometry.attributes.color.needsUpdate = true;
    return active || n > 0;
  };

  const clear = () => {
    for (const item of [...numbers, ...bolts, ...rings]) item.sprite.visible = false;
    sparks.length = 0;
    sparkGeometry.setDrawRange(0, 0);
  };

  return { spawnNumber, spawnSparks, spawnBolt, spawnRing, update, clear, damageColor: DUEL_FX.damage, burnColor: DUEL_FX.burn };
}

/**
 * The big black smoke that bursts round a player when the winning ball hits their head: dark swirling puffs,
 * burnt flakes and a few embers, played once on the GPU. `burst(worldPoint)` starts it there; `update(dt)`
 * returns true while it is still playing.
 */
export function createSmokeBurst(scene) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const rand = Math.random;
  const around = (spread, lift) => {
    const a = rand() * Math.PI * 2;
    const d = spread * (0.5 + rand() * 0.6);
    return [Math.cos(a) * d, lift * (0.3 + rand()) - 1.5, Math.sin(a) * d * 0.7];
  };
  const smokeColors = [DUEL_FX.smoke, DUEL_FX.smokeLight, '#1d2a44', '#0e1016'];
  const puffs = Array.from({ length: 40 }, () => ({
    start: [(rand() - 0.5) * 1.5, (rand() - 0.5) * 1.5, (rand() - 0.5) * 1.5],
    end: around(5.5, 4.5),
    birth: rand() * 0.25,
    life: 1.6 + rand() * 1.2,
    size: [1 + rand() * 0.8, 3.2 + rand() * 2.6],
    color: smokeColors[Math.floor(rand() * smokeColors.length)],
    seed: rand(),
  }));
  const flakes = Array.from({ length: 30 }, () => ({
    start: [0, 0, 0],
    end: around(8, 6),
    birth: rand() * 0.15,
    life: 1.0 + rand() * 0.9,
    size: [0.5 + rand() * 0.5, 0.2],
    color: '#0b0c10',
    seed: rand(),
  }));
  const embers = Array.from({ length: 24 }, () => ({
    start: [0, 0, 0],
    end: around(7, 6),
    birth: rand() * 0.2,
    life: 0.7 + rand() * 0.8,
    size: [0.45, 0.1],
    color: DUEL_FX.ember,
    seed: rand(),
  }));
  const fields = [
    createParticleField(puffs, { map: puffTexture(), period: 1000, opacity: 1.25 }),
    createParticleField(flakes, { map: shardTexture(), period: 1000 }),
    createParticleField(embers, { map: dotTexture(), period: 1000, blending: THREE.AdditiveBlending }),
  ];
  group.add(...fields);
  let time = Infinity;

  const burst = (point) => {
    group.position.copy(point);
    group.visible = true;
    time = 0;
  };
  const update = (dt) => {
    if (time > 3.2) {
      group.visible = false;
      return false;
    }
    time += dt;
    for (const field of fields) field.userData.update(time);
    return true;
  };
  return { burst, update };
}

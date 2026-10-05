import * as THREE from 'three';

// Small greyscale gradients for additive glow (fake bloom that works on every quality level).
const cache = {};

function gradientTexture(key, stops) {
  if (cache[key]) return cache[key];
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  for (const [at, alpha] of stops) gradient.addColorStop(at, `rgba(255,255,255,${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 128);
  cache[key] = new THREE.CanvasTexture(canvas);
  return cache[key];
}

/** Brightest across the middle (v = 0.5), fading to both edges: the halo either side of a neon strip. */
export const haloTexture = () =>
  gradientTexture('halo', [[0, 0], [0.3, 0.12], [0.45, 0.6], [0.5, 1], [0.55, 0.6], [0.7, 0.12], [1, 0]]);

/** Brightest at the top (v = 1), fading downward: glow spilling down a wall, or along a light beam. */
export const fadeTexture = () => gradientTexture('fade', [[0, 1], [0.25, 0.45], [0.6, 0.12], [1, 0]]);

/** Soft round dot, for sparkles and orb glows. */
export function dotTexture() {
  if (cache.dot) return cache.dot;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  cache.dot = new THREE.CanvasTexture(canvas);
  return cache.dot;
}

/** Four-point star with a soft glow, for the Explosions sparkle burst. */
export function starTexture() {
  if (cache.star) return cache.star;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  halo.addColorStop(0, 'rgba(255,255,255,0.55)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 ? 4 : 30;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    ctx[i ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  cache.star = new THREE.CanvasTexture(canvas);
  return cache.star;
}

/** Additive material for glows: never writes depth, so overlapping glows simply add up. */
export function additive(map, color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    map, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    // Additive light looks the same drawn in either order: one pass, not three.js's two (which also re-checks the
    // shader every frame).
    forceSinglePass: true,
  });
}

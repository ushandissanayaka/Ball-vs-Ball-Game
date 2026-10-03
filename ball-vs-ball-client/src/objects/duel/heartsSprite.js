import * as THREE from 'three';
import { DUEL_FX } from '../../config/palette.js';
import { canvasTexture } from '../../util/canvasText.js';

const SLOT = 96;
const MAX = 3;

/** A glossy red heart with a dark outline, centred at (x, y), `size` px across. */
export function drawHeart(ctx, x, y, size) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x - 50 * s, y - 48 * s);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(50, 92);
  ctx.bezierCurveTo(14, 66, 2, 46, 6, 28);
  ctx.bezierCurveTo(10, 8, 38, 2, 50, 24);
  ctx.bezierCurveTo(62, 2, 90, 8, 94, 28);
  ctx.bezierCurveTo(98, 46, 86, 66, 50, 92);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, 8, 0, 92);
  fill.addColorStop(0, '#ff5a63');
  fill.addColorStop(0.55, DUEL_FX.heart);
  fill.addColorStop(1, '#b30f1b');
  ctx.lineJoin = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#3d0509';
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(30, 28, 10, 7, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The hearts floating over a duelling player's head (up to three). `setCount(n)` repaints them; losing one
 * sends it popping up and away. `update(dt)` animates that pop; true while it plays.
 */
export function createHeartsSprite() {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = SLOT * MAX;
  canvas.height = SLOT;
  const texture = canvasTexture(canvas);
  const row = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const height = 1.15;
  row.scale.set(height * MAX, height, 1);
  row.renderOrder = 9;
  group.add(row);

  const lostCanvas = document.createElement('canvas');
  lostCanvas.width = lostCanvas.height = SLOT;
  drawHeart(lostCanvas.getContext('2d'), SLOT / 2, SLOT / 2, SLOT * 0.86);
  const lost = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(lostCanvas), transparent: true, depthWrite: false }));
  lost.visible = false;
  lost.renderOrder = 9;
  group.add(lost);

  let count = -1;
  let pop = -1; // seconds into the lost heart's pop, or < 0
  const setCount = (n) => {
    const next = Math.max(0, Math.min(MAX, n));
    if (next === count) return;
    if (next < count && count > 0) {
      // The rightmost remaining heart pops off.
      lost.position.set(((count - 1) - (count - 1) / 2) * height, 0, 0.01);
      pop = 0;
      lost.visible = true;
    }
    count = next;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const left = (canvas.width - count * SLOT) / 2;
    for (let i = 0; i < count; i += 1) drawHeart(ctx, left + SLOT * (i + 0.5), SLOT / 2, SLOT * 0.86);
    texture.needsUpdate = true;
  };

  const update = (dt) => {
    if (pop < 0) return false;
    pop += dt;
    const t = Math.min(1, pop / 0.9);
    const size = height * (1 + Math.sin(Math.min(1, t * 2.2) * Math.PI) * 0.9 + t * 0.3);
    lost.scale.set(size, size, 1);
    lost.position.y = t * 1.8;
    lost.material.opacity = 1 - t * t;
    lost.material.rotation = t * 0.8;
    if (t >= 1) {
      pop = -1;
      lost.visible = false;
    }
    return true;
  };

  return { group, setCount, update };
}

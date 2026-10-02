import { SKY } from '../../config/palette.js';

// Paints soft cumulus clouds into a 2D canvas: shaded blue-grey billows underneath, bright white ones on top,
// cut flat along the base like real fair-weather cumulus. Used by the sky dome and the 3D cloud cards.

function puff(ctx, x, y, r, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y - r * 0.15, r * 0.1, x, y, r);
  // Solid most of the way out, then a short soft edge: crisp billows rather than blurry smudges.
  gradient.addColorStop(0, hexAlpha(color, alpha));
  gradient.addColorStop(0.8, hexAlpha(color, alpha * 0.95));
  gradient.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** A cumulus `w` wide and about `h` tall, centred on x with its flat base at y. */
export function paintCumulus(ctx, x, baseY, w, h, rand, alpha = 1) {
  const puffs = [];
  const count = 9 + Math.floor(rand() * 7);
  for (let i = 0; i < count; i += 1) {
    const t = 0.08 + 0.84 * rand();
    const bell = Math.sin(Math.PI * t);
    const r = h * (0.22 + 0.4 * bell) * (0.75 + rand() * 0.4);
    puffs.push({ x: x + (t - 0.5) * w, y: baseY - r * 0.45 - bell * h * 0.3 * rand(), r });
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w, baseY - h * 3, w * 2, h * 3);
  ctx.clip();
  for (const p of puffs) puff(ctx, p.x, p.y + p.r * 0.18, p.r, SKY.cloudShade, alpha * 0.9);
  for (const p of puffs) puff(ctx, p.x - p.r * 0.06, p.y - p.r * 0.12, p.r * 0.86, SKY.cloud, alpha);
  ctx.restore();
}

/** A thin stretched wisp high in the sky. */
export function paintWisp(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / h, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, h);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, h, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

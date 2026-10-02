import * as THREE from 'three';
import { PROP } from '../../config/palette.js';
import { BODY_FONT, DISPLAY_FONT, canvasTexture } from '../../util/canvasText.js';
import { standard } from '../../util/materials.js';
import { block, box } from '../../util/mesh.js';

const CANVAS_W = 1024;
const CANVAS_H = 576;
const ROW_COLORS = ['#d6a52c', '#a2a9b7', '#a8642a'];
const ROW_PLAIN = ['#4c5a7c', '#56658a'];

/** Bux glyph: a grey hexagon with a lighter centre. */
function drawBux(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#d9dee8';
  ctx.fill();
  ctx.lineWidth = r * 0.25;
  ctx.strokeStyle = '#5c6376';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = '#7d8598';
  ctx.fill();
}

function outlined(ctx, text, x, y, { size, font = DISPLAY_FONT, weight = 400, fill = '#fff', stroke = '#0b1040', width = 0, align = 'left' }) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (width) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Paints the whole screen: title, header, top rows (gold, silver, bronze, then slate), and the viewer's row. */
function paintBoard(canvas, { title, rows, self }) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#17208c';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let y = 0; y < CANVAS_H; y += 6) ctx.fillRect(0, y, CANVAS_W, 3);

  // Title: fit to the width.
  let size = 74;
  ctx.font = `${size}px ${DISPLAY_FONT}`;
  while (ctx.measureText(title).width > CANVAS_W - 70 && size > 30) {
    size -= 2;
    ctx.font = `${size}px ${DISPLAY_FONT}`;
  }
  outlined(ctx, title, CANVAS_W / 2, 58, { size, width: 12, align: 'center' });

  const header = 128;
  outlined(ctx, 'Rank', 52, header, { size: 30, width: 6 });
  outlined(ctx, 'Name', 190, header, { size: 30, width: 6 });
  outlined(ctx, 'Amount', CANVAS_W - 52, header, { size: 30, width: 6, align: 'right' });

  const rowH = 46;
  const top = 154;
  const drawRow = (y, color, rank, name, amount) => {
    ctx.fillStyle = color;
    ctx.fillRect(36, y, CANVAS_W - 72, rowH - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(36, y, CANVAS_W - 72, 4);
    const mid = y + (rowH - 6) / 2;
    outlined(ctx, String(rank), 70, mid, { size: 26, font: BODY_FONT, weight: 900, width: 5 });
    outlined(ctx, name, 330, mid, { size: 27, font: BODY_FONT, weight: 900, width: 5, align: 'center' });
    const amountText = amount.toLocaleString('en-US');
    outlined(ctx, amountText, CANVAS_W - 60, mid, { size: 26, font: BODY_FONT, weight: 900, width: 5, align: 'right' });
    ctx.font = `900 26px ${BODY_FONT}`;
    drawBux(ctx, CANVAS_W - 60 - ctx.measureText(amountText).width - 22, mid, 12);
  };
  rows.forEach((row, index) => {
    drawRow(top + index * rowH, ROW_COLORS[index] ?? ROW_PLAIN[index % 2], index + 1, row.name, row.amount);
  });
  drawRow(top + 7 * rowH + 8, '#0d1458', self.rank, self.name, self.amount);
}

/**
 * A "Top Spenders" board: thick blue-purple frame on a low stand, glowing screen on the front.
 * `update({ title, rows })` repaints the screen.
 */
export function createLeaderboard({ title, rows, self = { rank: 51, name: 'You', amount: 0 } }) {
  const group = new THREE.Group();
  group.name = 'leaderboard';
  const frame = standard(PROP.boardFrame, { roughness: 0.45, metalness: 0.1 });
  block(group, [44, 1.4, 4.5], standard(PROP.boardStand, { roughness: 0.5 }), { position: [0, 0, 0] });
  block(group, [48, 27.5, 2.4], frame, { position: [0, 1.2, 0] });
  // A slightly raised lip around the screen.
  const lip = standard('#3a3fe0', { roughness: 0.4 });
  for (const [w, h, x, y] of [[47, 0.9, 0, 27.6], [47, 0.9, 0, 1.75], [0.9, 26, -23.1, 14.7], [0.9, 26, 23.1, 14.7]]) {
    box(group, [w, h, 0.6], lip, { position: [x, y, 1.45] });
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const texture = canvasTexture(canvas);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(45, 25.3), new THREE.MeshBasicMaterial({ map: texture }));
  screen.position.set(0, 14.7, 1.22);
  group.add(screen);

  const update = (next) => {
    paintBoard(canvas, { title: next.title ?? title, rows: next.rows ?? rows, self });
    texture.needsUpdate = true;
  };
  update({ title, rows });
  return { group, update };
}

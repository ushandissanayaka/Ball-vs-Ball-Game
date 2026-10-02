import * as THREE from 'three';

export const DISPLAY_FONT = '"Righteous", "Arial Black", sans-serif';
export const BODY_FONT = '"Nunito", "Arial Black", Arial, sans-serif';

/** Waits (at most 2.5 s) for the web fonts, so text painted into canvases uses them. */
export function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const load = Promise.all([document.fonts.load('64px "Righteous"'), document.fonts.load('900 64px "Nunito"')]);
  return Promise.race([load, new Promise((resolve) => setTimeout(resolve, 2500))]).catch(() => {});
}

export function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Fills with a vertical gradient between the line's top and bottom when `fill` is [top, bottom]. */
function fillStyle(ctx, fill, top, bottom) {
  if (!Array.isArray(fill)) return fill;
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, fill[0]);
  gradient.addColorStop(1, fill[1]);
  return gradient;
}

/** A gold coin glyph, for "Win 100 ●". */
export function drawCoin(ctx, x, y, r) {
  const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  gradient.addColorStop(0, '#fff3a0');
  gradient.addColorStop(0.55, '#ffc21a');
  gradient.addColorStop(1, '#d98a00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.18;
  ctx.strokeStyle = '#a86200';
  ctx.stroke();
}

/**
 * Paints outlined text lines into `canvas`, sized to fit.
 * Line: { text, size (px), fill (colour or [top, bottom]), stroke, strokeWidth, font?, weight?, coin? }
 */
export function paintLines(canvas, lines, { pad = 12 } = {}) {
  const ctx = canvas.getContext('2d');
  const fontOf = (line) => `${line.weight ?? 400} ${line.size}px ${line.font ?? DISPLAY_FONT}`;
  const widths = lines.map((line) => {
    ctx.font = fontOf(line);
    return ctx.measureText(line.text).width + (line.coin ? line.size * 1.1 : 0) + (line.strokeWidth ?? 0) * 2;
  });
  const heights = lines.map((line) => line.size * 1.18 + (line.strokeWidth ?? 0));
  canvas.width = Math.ceil(Math.max(...widths) + pad * 2);
  canvas.height = Math.ceil(heights.reduce((a, b) => a + b, 0) + pad * 2);

  let y = pad;
  lines.forEach((line, index) => {
    const height = heights[index];
    const textWidth = widths[index] - (line.coin ? line.size * 1.1 : 0);
    const left = (canvas.width - widths[index]) / 2 + (line.strokeWidth ?? 0);
    const mid = y + height / 2;
    ctx.font = fontOf(line);
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (line.strokeWidth) {
      ctx.lineWidth = line.strokeWidth * 2;
      ctx.strokeStyle = line.stroke;
      ctx.strokeText(line.text, left, mid);
    }
    ctx.fillStyle = fillStyle(ctx, line.fill, mid - line.size / 2, mid + line.size / 2);
    ctx.fillText(line.text, left, mid);
    if (line.coin) drawCoin(ctx, left + textWidth - (line.strokeWidth ?? 0) + line.size * 0.55, mid, line.size * 0.4);
    y += height;
  });
}

/**
 * A floating text label (always faces the camera, like a Roblox BillboardGui), `worldHeight` units tall.
 * `label.userData.setLines(lines)` repaints it (countdowns, player counts).
 */
export function createLabel(lines, { worldHeight }) {
  const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10;
  let current = '';
  const setLines = (next) => {
    const key = JSON.stringify(next);
    if (key === current) return false;
    current = key;
    const canvas = document.createElement('canvas');
    paintLines(canvas, next);
    // A texture's size is fixed once uploaded, so a repaint gets a new one.
    material.map?.dispose();
    material.map = canvasTexture(canvas);
    material.needsUpdate = true;
    sprite.scale.set((worldHeight * canvas.width) / canvas.height, worldHeight, 1);
    return true;
  };
  setLines(lines);
  sprite.userData.setLines = setLines;
  return sprite;
}

/** Big station label ("Balls", "2V2", ...) in the light-blue outlined style. */
export const stationLines = (text, style, size = 110) => [{ text, size, fill: style.fill, stroke: style.stroke, strokeWidth: size * 0.12 }];

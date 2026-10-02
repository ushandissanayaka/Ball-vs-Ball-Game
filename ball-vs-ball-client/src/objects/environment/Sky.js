import * as THREE from 'three';
import { SEA, SKY } from '../../config/palette.js';
import { mulberry32 } from '../../util/random.js';
import { paintCumulus, paintWisp } from './cloudPainter.js';

// The sky is painted once into an equirectangular canvas (top row = straight up, middle row = horizon) and
// shown on a dome; the same picture lights and reflects in the glassy floor and the sea. Nothing moves.
const W = 2048;
const H = 1024;

function paintSky() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, H / 2);
  sky.addColorStop(0, SKY.zenith);
  sky.addColorStop(0.5, SKY.mid);
  sky.addColorStop(0.9, SKY.horizon);
  sky.addColorStop(1, SKY.haze);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H / 2 + 1);

  const rand = mulberry32(7);
  // Each cloud is also drawn one width over, so the seam where the picture wraps around is invisible.
  const wrapped = (draw) => [-W, 0, W].forEach((offset) => draw(offset));

  for (let i = 0; i < 16; i += 1) {
    const x = rand() * W;
    const y = H * (0.1 + rand() * 0.22);
    const w = 160 + rand() * 300;
    const h = 8 + rand() * 14;
    const alpha = 0.25 + rand() * 0.3;
    wrapped((offset) => paintWisp(ctx, x + offset, y, w, h, alpha));
  }
  // Cumulus banks along the horizon, a few smaller ones higher up; kept small (under ~15° tall) so most of
  // the sky stays clear blue, as in the reference shots.
  for (let i = 0; i < 30; i += 1) {
    const high = i >= 20;
    const x = rand() * W;
    const base = H * (high ? 0.36 + rand() * 0.08 : 0.497 - rand() * 0.02);
    const w = high ? 50 + rand() * 90 : 90 + rand() * 150;
    const h = w * (0.3 + rand() * 0.18);
    const alpha = high ? 0.8 : 1;
    wrapped((offset) => paintCumulus(ctx, x + offset, base, w, h, rand, alpha));
  }

  // Below the horizon: the sky mirrored, tinted toward the sea's colour. It shows faintly through the
  // slightly see-through water (and in the baked reflections) as the sky's reflection.
  ctx.save();
  ctx.translate(0, H);
  ctx.scale(1, -1);
  ctx.drawImage(canvas, 0, 0, W, H / 2, 0, 0, W, H / 2);
  ctx.restore();
  const below = ctx.createLinearGradient(0, H / 2, 0, H);
  below.addColorStop(0, 'rgba(255,255,255,0)');
  below.addColorStop(0.25, SEA.far + '73');
  below.addColorStop(1, SEA.deep + 'cc');
  ctx.fillStyle = below;
  ctx.fillRect(0, H / 2, W, H / 2);
  return canvas;
}

/** The sky dome mesh. The reflections are baked from it (and the clouds) by bakeSkyReflections. */
export function createSky({ radius = 6000 } = {}) {
  const canvas = paintSky();

  const domeTexture = new THREE.CanvasTexture(canvas);
  domeTexture.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    new THREE.MeshBasicMaterial({ map: domeTexture, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -1;
  dome.name = 'sky';

  return dome;
}

/**
 * Snapshots the sky exactly as it is seen (the painted dome plus the 3D cloud cards) into the environment map
 * that lights the scene and is reflected by the sea and the glass. Done once at startup, so the clouds show in
 * the water at no cost per frame. `hidden` objects are left out of the snapshot (the sea, the stage).
 */
export function bakeSkyReflections(renderer, scene, hidden = [], { size = 256, height = 2 } = {}) {
  const target = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const camera = new THREE.CubeCamera(1, 10000, target);
  camera.position.set(0, height, 0);
  const wasVisible = hidden.map((object) => object.visible);
  hidden.forEach((object) => { object.visible = false; });
  camera.update(renderer, scene);
  hidden.forEach((object, i) => { object.visible = wasVisible[i]; });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromCubemap(target.texture).texture;
  pmrem.dispose();
  target.dispose();
  return environment;
}

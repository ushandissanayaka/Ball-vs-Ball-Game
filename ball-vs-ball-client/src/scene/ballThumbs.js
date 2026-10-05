import * as THREE from 'three';
import { createBallModel } from '../objects/duel/ballModels.js';
import { idle } from './headshot.js';

const SIZE = 256;
// Balls with parts standing out above them (axe, spear, knives, hook) are shot from further back.
const TALL = new Set(['axe', 'spear', 'hook', 'thief']);

// Linear light to sRGB bytes (render targets hold linear light).
const TO_SRGB = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
});

/**
 * The HUD's ball pictures, rendered from the duel's own 3D balls (lit, glossy, as in the reference's icons)
 * with the game's renderer into a small target, one ball per quiet moment between frames. `render(kind)`
 * resolves to an object URL of a transparent PNG.
 */
export function createBallThumbs(renderer, environment) {
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  const scene = new THREE.Scene();
  scene.environment = environment;
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(-8, 10, 12);
  const fill = new THREE.DirectionalLight('#9cc4ff', 0.7);
  fill.position.set(10, -2, 6);
  scene.add(key, fill, new THREE.HemisphereLight('#ffffff', '#30384a', 0.9));
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 300);

  const pixels = new Uint8Array(SIZE * SIZE * 4);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext('2d');
  const image = context.createImageData(SIZE, SIZE);

  let previous = null;
  const render = async (kind) => {
    await idle();
    const model = createBallModel(kind, 7, { thumbnail: true });
    model.setAxe(0.35, 1);
    model.setSpear(0.6, 1, 0);
    model.setKnives(3);
    model.setHookReady(true);
    model.update(0, 0.3);
    scene.add(model.group);
    const tall = TALL.has(kind);
    const lookY = tall ? 4.5 : kind === 'vampire' ? -1.2 : 0;
    camera.position.set(0, lookY, tall ? 54 : 40);
    camera.lookAt(0, lookY, 0);

    const clearColor = renderer.getClearColor(new THREE.Color());
    const clearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColor, clearAlpha);
    // The previous ball goes only now: the next one reuses its shaders instead of compiling them again.
    previous?.dispose();
    previous = model;
    model.group.visible = false;

    await renderer.readRenderTargetPixelsAsync(target, 0, 0, SIZE, SIZE, pixels);
    // The target's rows run bottom to top; images run top to bottom.
    for (let y = 0; y < SIZE; y += 1) {
      const from = (SIZE - 1 - y) * SIZE * 4;
      const to = y * SIZE * 4;
      for (let x = 0; x < SIZE * 4; x += 4) {
        image.data[to + x] = TO_SRGB[pixels[from + x]];
        image.data[to + x + 1] = TO_SRGB[pixels[from + x + 1]];
        image.data[to + x + 2] = TO_SRGB[pixels[from + x + 2]];
        image.data[to + x + 3] = pixels[from + x + 3];
      }
    }
    context.putImageData(image, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return URL.createObjectURL(blob);
  };

  const dispose = () => {
    previous?.dispose();
    target.dispose();
  };
  return { render, dispose };
}

import * as THREE from 'three';
import { HEADSHOT_LAYER } from '../objects/player/LegionCharacter.js';

const SIZE = 256;
const lit = new WeakSet(); // scenes whose lights already shine on the headshot layer
const HUD_SIZE = 128; // the HUD's copy: its portraits are about 100 px, and a smaller read back costs less

/** Resolves in a quiet moment between frames (soon anyway). */
export const idle = () => new Promise((resolve) => {
  if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 400 });
  else setTimeout(resolve, 50);
});

// Linear light to sRGB bytes, for reading a headshot back out as an image.
const TO_SRGB = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
});

/**
 * A player's picture for the duel board and HUD: the character's head and shoulders, rendered from the front
 * into a small texture with a clear background. `capture()` redraws it (once the avatar has loaded, and when
 * the character joins an arena, so it shows the way they face); it costs one tiny render, not one per frame.
 * `toImage()` reads the last capture back as an ImageBitmap, for the HUD's round portraits. It never stalls
 * the game: it waits for a quiet moment between frames, and the pixels come back from the GPU when they are
 * ready (a plain read would wait for every frame the GPU still has queued).
 */
export function createHeadshot(renderer, scene, character, { hud = true } = {}) {
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  // Players only seen on an arena's screen (not duelling us) need no HUD portrait.
  const hudTarget = hud ? new THREE.WebGLRenderTarget(HUD_SIZE, HUD_SIZE, { samples: 4 }) : null;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);
  camera.layers.set(HEADSHOT_LAYER);
  if (!lit.has(scene)) {
    lit.add(scene);
    scene.traverse((object) => { if (object.isLight) object.layers.enable(HEADSHOT_LAYER); });
  }

  const head = new THREE.Vector3();
  const capture = () => {
    character.headPosition(head);
    head.y -= 0.35; // a little down, to take in the shoulders
    const yaw = character.group.rotation.y;
    camera.position.set(head.x + Math.sin(yaw) * 7.5, head.y + 0.6, head.z + Math.cos(yaw) * 7.5);
    camera.lookAt(head);

    const { background, fog } = scene;
    const clearAlpha = renderer.getClearAlpha();
    const clearColor = renderer.getClearColor(new THREE.Color());
    scene.background = null;
    scene.fog = null;
    renderer.setClearColor(0x000000, 0);
    for (const into of hudTarget ? [target, hudTarget] : [target]) {
      renderer.setRenderTarget(into);
      renderer.clear();
      renderer.render(scene, camera);
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColor, clearAlpha);
    scene.background = background;
    scene.fog = fog;
  };

  const pixels = new Uint8Array(HUD_SIZE * HUD_SIZE * 4);
  const image = new ImageData(HUD_SIZE, HUD_SIZE);
  let reading = null;
  const toImage = async () => {
    // One read at a time: a capture taken meanwhile is picked up by the next call.
    await reading;
    reading = (async () => {
      await idle();
      await renderer.readRenderTargetPixelsAsync(hudTarget, 0, 0, HUD_SIZE, HUD_SIZE, pixels);
      // The render target's rows run bottom to top; images run top to bottom.
      for (let y = 0; y < HUD_SIZE; y += 1) {
        const from = (HUD_SIZE - 1 - y) * HUD_SIZE * 4;
        const to = y * HUD_SIZE * 4;
        for (let x = 0; x < HUD_SIZE * 4; x += 4) {
          image.data[to + x] = TO_SRGB[pixels[from + x]];
          image.data[to + x + 1] = TO_SRGB[pixels[from + x + 1]];
          image.data[to + x + 2] = TO_SRGB[pixels[from + x + 2]];
          image.data[to + x + 3] = pixels[from + x + 3];
        }
      }
      // A bitmap the HUD draws as it is: no PNG to encode or decode.
      return createImageBitmap(image);
    })();
    return reading;
  };

  const dispose = () => {
    target.dispose();
    hudTarget?.dispose();
  };
  return { texture: target.texture, capture, toImage, dispose };
}

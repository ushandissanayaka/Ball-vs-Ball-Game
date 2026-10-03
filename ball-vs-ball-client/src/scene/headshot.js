import * as THREE from 'three';
import { HEADSHOT_LAYER } from '../objects/player/LegionCharacter.js';

const SIZE = 256;

// Linear light to sRGB bytes, for reading a headshot back out as an image.
const TO_SRGB = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
});

/**
 * A player's picture for the duel board and HUD: the character's head and shoulders, rendered from the front
 * into a small texture with a clear background. `capture()` redraws it (once the avatar has loaded, and when
 * the character joins an arena, so it shows the way they face); it costs one tiny render, not one per frame.
 * `toDataURL()` reads the last capture back as a PNG, for the HUD's round portraits.
 */
export function createHeadshot(renderer, scene, character) {
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);
  camera.layers.set(HEADSHOT_LAYER);
  scene.traverse((object) => { if (object.isLight) object.layers.enable(HEADSHOT_LAYER); });

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
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColor, clearAlpha);
    scene.background = background;
    scene.fog = fog;
  };

  const toDataURL = () => {
    const pixels = new Uint8Array(SIZE * SIZE * 4);
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(SIZE, SIZE);
    // The render target's rows run bottom to top; images run top to bottom.
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
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const dispose = () => target.dispose();
  return { texture: target.texture, capture, toDataURL, dispose };
}

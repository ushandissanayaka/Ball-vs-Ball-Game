import * as THREE from 'three';

// Stickers: an emoji that pops up over a player's head, bobs there a moment and fades. Built to cost next to
// nothing: each emoji is painted once into a small texture and shared, a bubble is one sprite, at most one per
// player (a new sticker replaces the old), and it only asks for frames while one is showing.

export const STICKERS = ['😱', '😯', '😃', '🤢', '🤔', '😈'];

const SIZE = 128;
const LIFE = 3; // seconds on show
const LIFT = 4.6; // over the head, clear of the duel hearts floating there
const textures = new Map();

function textureOf(index) {
  if (!textures.has(index)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const c = canvas.getContext('2d');
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `${SIZE * 0.78}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    c.shadowColor = 'rgba(0, 0, 0, 0.35)';
    c.shadowBlur = 6;
    c.shadowOffsetY = 3;
    c.fillText(STICKERS[index], SIZE / 2, SIZE / 2 + SIZE * 0.04);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.set(index, texture);
  }
  return textures.get(index);
}

const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

/**
 * show(key, index, headOf)   pops sticker `index` over `key`'s head; headOf(target) writes the head's position
 *                           (or returns false when that player is gone)
 * update(dt)                true while any is showing (the frame needs drawing)
 */
export function createStickerBubbles(scene) {
  const bubbles = new Map(); // key -> { sprite, age, headOf }
  const at = new THREE.Vector3();

  const show = (key, index, headOf) => {
    if (!STICKERS[index]) return;
    let bubble = bubbles.get(key);
    if (!bubble) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sprite.renderOrder = 11;
      scene.add(sprite);
      bubble = { sprite };
      bubbles.set(key, bubble);
    }
    bubble.sprite.material.map = textureOf(index);
    bubble.sprite.material.needsUpdate = true;
    bubble.age = 0;
    bubble.headOf = headOf;
  };

  const update = (dt) => {
    if (!bubbles.size) return false;
    for (const [key, bubble] of bubbles) {
      bubble.age += dt;
      const { sprite, age } = bubble;
      if (age >= LIFE || bubble.headOf(at) === false) {
        sprite.removeFromParent();
        sprite.material.dispose();
        bubbles.delete(key);
        continue;
      }
      const grow = easeOutBack(Math.min(1, age / 0.3));
      const fade = Math.min(1, (LIFE - age) / 0.4);
      sprite.scale.setScalar(2.6 * grow);
      sprite.material.opacity = fade;
      sprite.position.copy(at).y += LIFT + Math.sin(age * 5) * 0.12 + Math.min(1, age / 0.3) * 0.4;
    }
    return true;
  };

  return { show, update };
}

/** Paints every sticker and puts it on the GPU now (in a quiet moment), so the first one used never stutters. */
export function warmStickers(renderer) {
  STICKERS.forEach((_, i) => renderer.initTexture(textureOf(i)));
}

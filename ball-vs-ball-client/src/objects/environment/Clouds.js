import * as THREE from 'three';
import { mulberry32 } from '../../util/random.js';
import { paintCumulus } from './cloudPainter.js';

// Cloud cards standing in a wide ring far out over the sea, in front of the painted sky, so the clouds have
// real depth: they shift against the sky as the camera turns. Fog is off for them so they stay crisp white
// against the blue, as in the reference shots. Static.
const VARIANTS = 4;
const COUNT = 22;

function paintCard(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  // Sized so the widest billows still end inside the canvas (no hard cut-off at the card's edge).
  paintCumulus(canvas.getContext('2d'), 256, 236, 280, 150, mulberry32(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createClouds({ seed = 11 } = {}) {
  const group = new THREE.Group();
  group.name = 'clouds';
  const materials = Array.from({ length: VARIANTS }, (_, i) =>
    new THREE.MeshBasicMaterial({ map: paintCard(100 + i), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }),
  );
  const reflectionMaterials = materials.map((material) => {
    const reflection = material.clone();
    reflection.opacity = 0.75;
    reflection.side = THREE.DoubleSide; // the flip turns the card's front face away
    return reflection;
  });
  const plane = new THREE.PlaneGeometry(1, 0.5);
  const rand = mulberry32(seed);
  for (let i = 0; i < COUNT; i += 1) {
    const angle = (i / COUNT) * Math.PI * 2 + rand() * 0.2;
    const distance = 2000 + rand() * 1600;
    const width = 260 + rand() * 420;
    const card = new THREE.Mesh(plane, materials[i % VARIANTS]);
    card.scale.set(width * (rand() < 0.5 ? 1 : -1), width * (0.8 + rand() * 0.4), 1);
    card.position.set(Math.cos(angle) * distance, 60 + rand() * 220 + width * 0.25, Math.sin(angle) * distance);
    card.lookAt(0, card.position.y, 0);
    card.renderOrder = -1;
    group.add(card);

    // Its reflection: the same card mirrored under the water (the sea is slightly see-through), exactly where
    // a mirror image would be. Fainter, as reflections in water are.
    const mirrored = new THREE.Mesh(plane, reflectionMaterials[i % VARIANTS]);
    mirrored.position.set(card.position.x, -card.position.y, card.position.z);
    mirrored.quaternion.copy(card.quaternion);
    mirrored.scale.set(card.scale.x, -card.scale.y, 1);
    mirrored.renderOrder = -2;
    group.add(mirrored);
  }
  return group;
}

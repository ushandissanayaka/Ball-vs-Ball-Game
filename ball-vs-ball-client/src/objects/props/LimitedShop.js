import * as THREE from 'three';
import { LABEL, NEON, PROP } from '../../config/palette.js';
import { canvasTexture, createLabel, stationLines, DISPLAY_FONT } from '../../util/canvasText.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box } from '../../util/mesh.js';

/** Chain links laid along a curve, alternating between flat and upright, as one instanced mesh. */
function chain(points, material, { linkRadius = 0.55, tube = 0.16 } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(linkRadius, tube, 6, 12), material, points.length - 1);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < points.length - 1; i += 1) {
    dummy.position.copy(points[i]).lerp(points[i + 1], 0.5);
    dummy.lookAt(points[i + 1]);
    dummy.rotateY(Math.PI / 2); // the link's long axis along the chain
    if (i % 2) dummy.rotateX(Math.PI / 2);
    dummy.scale.set(1.35, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.castShadow = true;
  return mesh;
}

function ringPoints(radius, count, toPoint) {
  return Array.from({ length: count + 1 }, (_, i) => toPoint((i / count) * Math.PI * 2, radius));
}

function buyFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff4a63';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#ffd0d8';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 108);
  ctx.font = `64px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5a0716';
  ctx.fillText('BUY', 128, 68);
  return canvasTexture(canvas);
}

/**
 * The limited-time offer stand: a dark plinth with a glowing chain ring holding this rotation's item (a chained
 * ball), a chain halo on the floor, a red BUY box, a floating warning triangle and the "Ends in" countdown.
 * `setEndsIn(text)` updates the countdown.
 */
export function createLimitedShop() {
  const group = new THREE.Group();
  group.name = 'limited-shop';
  block(group, [20, 1.4, 14], standard(PROP.plinth, { roughness: 0.5 }));
  box(group, [20.2, 0.3, 0.3], glow(NEON.red, 1.4), { position: [0, 0.3, 7.05], cast: false });

  const redGlow = glow(NEON.red, 2);
  const darkMetal = standard(PROP.chainDark, { roughness: 0.35, metalness: 0.8 });

  // Upright chain ring, with the offer's ball held in the middle.
  const ringCenter = new THREE.Vector3(-4.5, 9, -1.5);
  group.add(chain(ringPoints(5.2, 26, (a, r) => new THREE.Vector3(ringCenter.x + Math.cos(a) * r, ringCenter.y + Math.sin(a) * r, ringCenter.z)), redGlow));
  addMesh(group, new THREE.SphereGeometry(2.5, 28, 18), standard('#1d1a24', { roughness: 0.25, metalness: 0.6 }), { position: ringCenter.toArray() });
  addMesh(group, new THREE.TorusGeometry(2.55, 0.22, 8, 40), redGlow, { position: ringCenter.toArray(), rotation: [Math.PI / 2.4, 0.3, 0], cast: false });
  addMesh(group, new THREE.TorusGeometry(2.55, 0.22, 8, 40), redGlow, { position: ringCenter.toArray(), rotation: [0.4, Math.PI / 2, 0], cast: false });
  // Chains hanging off the ring down to the plinth.
  const hang = (from, to, count) => Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    return new THREE.Vector3().lerpVectors(from, to, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * 1.2, 0));
  });
  group.add(chain(hang(new THREE.Vector3(-8.5, 5.5, -1.5), new THREE.Vector3(-8.8, 1.5, 4.5), 9), darkMetal));
  group.add(chain(hang(new THREE.Vector3(-0.6, 5.5, -1.5), new THREE.Vector3(1.5, 1.5, -5.5), 9), darkMetal));
  // Pole the ring stands on.
  block(group, [0.8, 2.6, 0.8], darkMetal, { position: [-4.5, 1.4, -1.5] });

  // Chain halo lying on the plinth, around the BUY box.
  const buyAt = new THREE.Vector3(4.5, 1.4, 2.5);
  group.add(chain(ringPoints(3.6, 20, (a, r) => new THREE.Vector3(buyAt.x + Math.cos(a) * r, buyAt.y + 0.35, buyAt.z + Math.sin(a) * r)), redGlow, { linkRadius: 0.45, tube: 0.13 }));
  const side = standard(PROP.shopRed, { roughness: 0.4 });
  const front = new THREE.MeshBasicMaterial({ map: buyFaceTexture(), toneMapped: false });
  addMesh(group, new THREE.BoxGeometry(4.6, 2.6, 3.2), [side, side, side, side, front, side], {
    position: [buyAt.x, buyAt.y + 1.3, buyAt.z],
  });

  // Floating triangle: a torus with three tube segments is a triangle outline.
  addMesh(group, new THREE.TorusGeometry(1.6, 0.2, 4, 3), redGlow, { position: [6, 13, -2], rotation: [0, -0.4, Math.PI / 2], cast: false });

  const label = createLabel(stationLines('Ends in --', LABEL.offer, 90), { worldHeight: 3.6 });
  label.position.set(-3, 17.5, 0);
  group.add(label);

  const setEndsIn = (text) => label.userData.setLines(stationLines(`Ends in ${text}`, LABEL.offer, 90));
  return { group, setEndsIn };
}

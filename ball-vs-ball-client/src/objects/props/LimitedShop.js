import * as THREE from 'three';
import { LABEL, NEON, PROP } from '../../config/palette.js';
import { canvasTexture, createLabel, stationLines, DISPLAY_FONT } from '../../util/canvasText.js';
import { chain, ringPoints } from '../../util/chain.js';
import { glow, standard } from '../../util/materials.js';
import { addMesh, block, box } from '../../util/mesh.js';
import { createLimitedShowcase } from './LimitedShowcase.js';

function buyFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff8a9c';
  ctx.fillRect(0, 0, 256, 220);
  ctx.strokeStyle = '#ffe3e8';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 200);
  ctx.font = `64px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c21431';
  ctx.fillText('BUY', 128, 114);
  return canvasTexture(canvas);
}

/**
 * The limited-time offer stand: a dark plinth with the animated show of this rotation's item (see
 * LimitedShowcase), a glowing chain on the floor round the BUY box, and the "Ends in" countdown.
 * `setEndsIn(text)` updates the countdown; `update(seconds)` runs the show.
 */
export function createLimitedShop() {
  const group = new THREE.Group();
  group.name = 'limited-shop';
  block(group, [20, 1.4, 14], standard(PROP.plinth, { roughness: 0.5 }));
  box(group, [20.2, 0.3, 0.3], glow(NEON.red, 1.4), { position: [0, 0.3, 7.05], cast: false });

  // The animated show: the bike and rider, the summoned ball and the chain figure.
  const showcase = createLimitedShowcase();
  group.add(showcase.group);

  // The BUY box: a big dark cube in the middle front, "BUY" glowing on its top, a glowing chain on the floor
  // round it (as in the reference shots).
  const redGlow = glow(NEON.red, 2);
  const buyAt = new THREE.Vector3(-2.2, 1.4, 3.4);
  const [buyW, buyH, buyD] = [6, 4.2, 5.2];
  group.add(chain(ringPoints(4.6, 26, (a, r) => new THREE.Vector3(buyAt.x + Math.cos(a) * r, buyAt.y + 0.35, buyAt.z + Math.sin(a) * r * 0.85)), redGlow, { linkRadius: 0.5, tube: 0.14 }));
  const side = standard('#1a2238', { roughness: 0.55 });
  const top = new THREE.MeshBasicMaterial({ map: buyFaceTexture(), toneMapped: false });
  addMesh(group, new THREE.BoxGeometry(buyW, buyH, buyD), [side, side, top, side, side, side], {
    position: [buyAt.x, buyAt.y + buyH / 2, buyAt.z],
  });

  const label = createLabel(stationLines('Ends in --', LABEL.offer, 90), { worldHeight: 3.6 });
  label.position.set(-1, 20.5, 0);
  group.add(label);

  const setEndsIn = (text) => label.userData.setLines(stationLines(`Ends in ${text}`, LABEL.offer, 90));
  return { group, setEndsIn, update: showcase.update };
}

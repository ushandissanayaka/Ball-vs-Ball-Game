import * as THREE from 'three';
import { LABEL, PROP } from '../../config/palette.js';
import { createLabel, stationLines } from '../../util/canvasText.js';
import { standard } from '../../util/materials.js';
import { block, box, sphere } from '../../util/mesh.js';

/** "Flyers": a dark square screen standing in an open cardboard box, a red and a blue ball floating on it. */
export function createFlyersDisplay() {
  const group = new THREE.Group();
  group.name = 'flyers';
  block(group, [13, 1.2, 10], standard(PROP.plinth, { roughness: 0.5 }));

  const card = standard(PROP.cardboard, { roughness: 0.85 });
  const flap = standard(PROP.cardboardFlap, { roughness: 0.85 });
  block(group, [5.6, 5, 5.2], card, { position: [0, 1.2, 0.6] });
  box(group, [5.7, 0.25, 0.5], standard('#d8c08a', { roughness: 0.8 }), { position: [0, 3.6, 3.25] }); // tape
  // Open flaps folded outward.
  box(group, [5.6, 0.18, 2.4], flap, { position: [0, 6.6, 4.2], rotation: [0.55, 0, 0] });
  box(group, [5.6, 0.18, 2.4], flap, { position: [0, 6.6, -3], rotation: [-0.55, 0, 0] });
  box(group, [2.4, 0.18, 5.2], flap, { position: [3.6, 6.6, 0.6], rotation: [0, 0, -0.55] });
  box(group, [2.4, 0.18, 5.2], flap, { position: [-3.6, 6.6, 0.6], rotation: [0, 0, 0.55] });

  // The screen stands inside the box, its bottom edge hidden in it.
  const screenY = 5 + 6.2;
  box(group, [12.4, 12.4, 0.9], standard(PROP.arenaFrame, { roughness: 0.45, metalness: 0.2 }), { position: [0, screenY, 0.4] });
  box(group, [11.2, 11.2, 0.1], standard(PROP.arenaScreen, { roughness: 0.3, metalness: 0.1 }), { position: [0, screenY, 0.9] });
  sphere(group, 1.5, standard('#e23b44', { roughness: 0.25, metalness: 0.05 }), { position: [3, screenY + 3, 2.2] });
  sphere(group, 1.4, standard('#2f86ea', { roughness: 0.25, metalness: 0.05 }), { position: [-3.1, screenY - 2.6, 2.2] });

  const label = createLabel(stationLines('Flyers', LABEL.station), { worldHeight: 4.6 });
  // Well in front of the screen, so seen from an angle the label isn't cut by it.
  label.position.set(0, screenY + 0.5, 9);
  group.add(label);
  return group;
}

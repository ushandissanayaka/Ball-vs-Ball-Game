import * as THREE from 'three';
import { MASCOT } from '../../config/palette.js';
import { standard } from '../../util/materials.js';
import { addMesh } from '../../util/mesh.js';

// The giant ball mascots around the map (decor, not players): the orange ball perched on a leaderboard, the grumpy
// blue blob and the smiling pink blob in the sea, and the red ball at the end of the runway. Each is built
// facing +z, then turned to look at its `lookAt` point.

/** Point on an ellipsoid with radii [a, b, c] in the direction `dir`. */
function onSurface(dir, [a, b, c], lift = 0) {
  const d = new THREE.Vector3(...dir).normalize();
  const t = 1 / Math.sqrt((d.x / a) ** 2 + (d.y / b) ** 2 + (d.z / c) ** 2);
  return d.multiplyScalar(t + lift);
}

/** Puts `mesh` on the body's surface, facing outward along the surface direction. */
function stick(group, mesh, dir, radii, lift = 0) {
  mesh.position.copy(onSurface(dir, radii, lift));
  mesh.lookAt(mesh.position.clone().multiplyScalar(2));
  group.add(mesh);
}

const white = () => standard(MASCOT.eyeRing, { roughness: 0.3 });

/** Round eye as on the red and orange balls: a thick dark rim around a pale disc, standing out from the body. */
function rimmedEye(group, dir, radii, size) {
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.45, 40), standard(MASCOT.eyeRim, { roughness: 0.4 }));
  rim.geometry.rotateX(Math.PI / 2);
  stick(group, rim, dir, radii);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.74, size * 0.74, size * 0.45, 40), standard(MASCOT.eyePale, { roughness: 0.25 }));
  disc.geometry.rotateX(Math.PI / 2);
  stick(group, disc, dir, radii, size * 0.1);
}

/** Flattened white oval eye, optionally tilted (radians) for a worried or cross look. */
function ovalEye(group, dir, radii, [w, h], tilt = 0) {
  const oval = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), white());
  oval.scale.set(w, h, Math.min(w, h) * 0.35);
  stick(group, oval, dir, radii, -Math.min(w, h) * 0.1);
  oval.rotateZ(tilt);
}

/** A curved white mouth (an arc of a torus): smiling, or frowning when `frown` is set. */
function mouth(group, dir, radii, radius, tube, { arc = Math.PI * 0.7, frown = false } = {}) {
  const geometry = new THREE.TorusGeometry(radius, tube, 10, 32, arc);
  // Centre the arc at the bottom (smile) or the top (frown).
  geometry.rotateZ((frown ? Math.PI / 2 : -Math.PI / 2) - arc / 2);
  stick(group, new THREE.Mesh(geometry, white()), dir, radii, -tube * 0.2);
}

function body(color, radius, stretch) {
  const group = new THREE.Group();
  const radii = stretch.map((s) => s * radius);
  addMesh(group, new THREE.SphereGeometry(1, 48, 32), standard(color, { roughness: 0.32, metalness: 0.05 }), { scale: radii });
  return { group, radii };
}

function placed(group, { position, lookAt }) {
  group.position.set(...position);
  group.lookAt(...lookAt);
  return group;
}

export function createMascots(config) {
  const all = new THREE.Group();
  all.name = 'mascots';

  {
    const { group, radii } = body(MASCOT.orange, config.orange.radius, config.orange.stretch);
    rimmedEye(group, [-0.36, 0, 1], radii, 1.7);
    rimmedEye(group, [0.36, 0, 1], radii, 1.7);
    all.add(placed(group, config.orange));
  }
  {
    const { group, radii } = body(MASCOT.red, config.red.radius, config.red.stretch);
    rimmedEye(group, [-0.42, 0, 1], radii, 4.2);
    rimmedEye(group, [0.42, 0, 1], radii, 4.2);
    all.add(placed(group, config.red));
  }
  {
    const { group, radii } = body(MASCOT.blue, config.blue.radius, config.blue.stretch);
    // Grumpy: two small eyes tipped toward each other, and a frown.
    ovalEye(group, [-0.16, 0.5, 1], radii, [1.3, 3.2], -0.45);
    ovalEye(group, [0.16, 0.5, 1], radii, [1.3, 3.2], 0.45);
    mouth(group, [0, 0.24, 1], radii, 6.5, 1.1, { arc: Math.PI * 0.75, frown: true });
    all.add(placed(group, config.blue));
  }
  {
    const { group, radii } = body(MASCOT.pink, config.pink.radius, config.pink.stretch);
    ovalEye(group, [-0.2, 0.45, 1], radii, [1.3, 2.4]);
    ovalEye(group, [0.2, 0.45, 1], radii, [1.3, 2.4]);
    mouth(group, [0, 0.3, 1], radii, 4.5, 0.75, { arc: Math.PI * 0.6 });
    all.add(placed(group, config.pink));
  }
  return all;
}

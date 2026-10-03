import * as THREE from 'three';

/**
 * Chain links laid along a list of points, alternating between flat and upright, as one instanced mesh (one
 * draw call however long the chain). `cast: false` for chains that move: the shadow map is drawn only once.
 */
export function chain(points, material, { linkRadius = 0.55, tube = 0.16, cast = true } = {}) {
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
  mesh.castShadow = cast;
  return mesh;
}

/** `count + 1` points round a closed loop: `toPoint(angle, radius)` places each one. */
export function ringPoints(radius, count, toPoint) {
  return Array.from({ length: count + 1 }, (_, i) => toPoint((i / count) * Math.PI * 2, radius));
}

/** Points along an upright helix round the y axis, from y = `from` to y = `to`. */
export function helixPoints({ radius, from, to, turns, count, phase = 0 }) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const a = phase + t * turns * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, from + (to - from) * t, Math.sin(a) * radius);
  });
}

import * as THREE from 'three';

/**
 * Adds a mesh to `parent`. Options: position [x,y,z], rotation [x,y,z], scale (number or [x,y,z]),
 * cast / receive (shadows, both on by default).
 */
export function addMesh(parent, geometry, material, { position, rotation, scale, cast = true, receive = true } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  if (scale !== undefined) Array.isArray(scale) ? mesh.scale.set(...scale) : mesh.scale.setScalar(scale);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

/** Box of size [w, h, d] whose centre sits at `position`. */
export const box = (parent, [w, h, d], material, options) => addMesh(parent, new THREE.BoxGeometry(w, h, d), material, options);

/** Box of size [w, h, d] resting on y = `position[1]` (bottom face there, not the centre). */
export function block(parent, [w, h, d], material, { position = [0, 0, 0], ...options } = {}) {
  return box(parent, [w, h, d], material, { ...options, position: [position[0], position[1] + h / 2, position[2]] });
}

export const sphere = (parent, radius, material, options, detail = [24, 16]) =>
  addMesh(parent, new THREE.SphereGeometry(radius, ...detail), material, options);

/** Places `group` at [x, z] on the floor at height y, turned by `rotation`. */
export function place(group, [x, z], y, rotation = 0) {
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  return group;
}

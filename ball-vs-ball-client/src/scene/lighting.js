import * as THREE from 'three';

// The middle of the map at sea level: shadows have to land on the water as well as the deck.
const MAP_CENTER = new THREE.Vector3(0, 0, 140);
// High overhead, a little to the right (east) of the default view and a touch behind the hub, so the floating
// deck's shadow falls just west and south of it on the sea, as in the reference shots.
const SUN_OFFSET = new THREE.Vector3(95, 320, -60);
const SHADOW_HALF = 285; // half-size of the shadowed area; covers the whole map and the blobs in the sea

/**
 * Bright midday light: the sun casting soft shadows onto the deck and the sea, plus a sky/sea hemisphere fill
 * that keeps shadowed areas blue rather than black. The shadow map is drawn once (nothing that casts moves).
 */
export function createLighting() {
  const group = new THREE.Group();
  group.name = 'lighting';
  group.add(new THREE.HemisphereLight('#cfe8ff', '#2a5c9e', 0.75));

  const sun = new THREE.DirectionalLight('#fff4e2', 2.8);
  sun.position.copy(MAP_CENTER).add(SUN_OFFSET);
  sun.target.position.copy(MAP_CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 100, far: 600,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.8;
  sun.shadow.radius = 4;
  group.add(sun, sun.target);
  return group;
}

/** Sets the sun's shadow resolution (the old map is dropped and redrawn at the new size). */
export function setShadowResolution(scene, size) {
  scene.traverse((light) => {
    if (!light.isDirectionalLight || light.shadow.mapSize.x === size) return;
    light.shadow.mapSize.set(size, size);
    light.shadow.map?.dispose();
    light.shadow.map = null;
  });
}

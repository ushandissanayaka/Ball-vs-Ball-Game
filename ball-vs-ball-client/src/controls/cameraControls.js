import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA } from '../config/layout.js';

/**
 * Third-person camera round the player character: drag to orbit, wheel / pinch to zoom. `follow(point)` keeps
 * the orbit point on the character as it walks (the camera keeps its angle and distance), and the camera never
 * goes under the water. `view` ([x, y, z, tx, ty, tz], the ?cam= debug option) starts on a set view and stops
 * following, for screenshots. `setCinematic(position, target)` takes the camera off the player (a duel): it
 * glides to that shot and stays on it, following each new one; `clearCinematic(point)` hands it back, orbiting
 * `point`. `update(dt)` returns true when the view changed.
 */
export function createCameraControls(camera, element, view = null) {
  const controls = new OrbitControls(camera, element);
  controls.target.set(...CAMERA.target);
  if (view) {
    camera.position.set(view[0], view[1], view[2]);
    controls.target.set(view[3], view[4], view[5]);
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.enablePan = false; // the character is the centre of the view
  controls.minDistance = CAMERA.minDistance;
  controls.maxDistance = CAMERA.maxDistance;
  controls.maxPolarAngle = CAMERA.maxPolarAngle;
  controls.zoomSpeed = 1.1;
  controls.update();

  let cinematic = null; // { position, target } while a duel holds the camera
  const look = new THREE.Vector3(); // where the camera looks during a cinematic shot

  const shift = new THREE.Vector3();
  const follow = (point) => {
    if (view || cinematic) return;
    shift.subVectors(point, controls.target);
    if (shift.lengthSq() < 1e-8) return;
    controls.target.add(shift);
    camera.position.add(shift);
  };

  const setCinematic = (position, target) => {
    if (!cinematic) {
      cinematic = { position: new THREE.Vector3(), target: new THREE.Vector3() };
      look.copy(controls.target);
      controls.enabled = false;
    }
    cinematic.position.copy(position);
    cinematic.target.copy(target);
  };

  const clearCinematic = (point) => {
    if (!cinematic) return;
    cinematic = null;
    controls.target.copy(point);
    controls.enabled = true;
    controls.update();
  };

  const update = (dt) => {
    if (cinematic) {
      // Glide, quickly at first then settling, so cuts between shots never jump.
      const k = 1 - Math.exp(-dt * 4.5);
      const before = camera.position.distanceToSquared(cinematic.position) + look.distanceToSquared(cinematic.target);
      camera.position.lerp(cinematic.position, k);
      look.lerp(cinematic.target, k);
      camera.lookAt(look);
      return before > 1e-6;
    }
    const changed = controls.update(dt);
    // The orbit may dip below the deck to look up at it, but the camera never goes under the water.
    if (camera.position.y < CAMERA.minHeight) {
      camera.position.y = CAMERA.minHeight;
      camera.lookAt(controls.target);
    }
    return changed;
  };

  return { update, follow, setCinematic, clearCinematic, dispose: () => controls.dispose() };
}

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA } from '../config/layout.js';

const PAN_SPEED = 90; // world units per second for WASD / arrow keys
const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

/**
 * Free look around the lobby (no character yet): drag to orbit, wheel / pinch to zoom, right-drag or two-finger
 * drag to pan, WASD / arrows to glide. The orbit point stays over the map and the camera above the sea.
 * `update(dt)` returns true when the view changed (the world only re-renders then).
 */
export function createCameraControls(camera, element, view = null) {
  const controls = new OrbitControls(camera, element);
  controls.target.set(...CAMERA.target);
  if (view) {
    camera.position.set(view[0], view[1], view[2]);
    controls.target.set(view[3], view[4], view[5]);
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false; // pan across the floor, not up into the sky
  controls.minDistance = CAMERA.minDistance;
  controls.maxDistance = CAMERA.maxDistance;
  controls.maxPolarAngle = CAMERA.maxPolarAngle;
  controls.zoomSpeed = 1.1;
  controls.update();

  const held = new Set();
  const onKeyDown = (event) => {
    if (KEYS[event.code] && !event.target.closest?.('input, textarea')) held.add(event.code);
  };
  const onKeyUp = (event) => held.delete(event.code);
  const onBlur = () => held.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const { bounds } = CAMERA;

  const update = (dt) => {
    if (held.size) {
      camera.getWorldDirection(forward).setY(0).normalize();
      right.crossVectors(forward, camera.up).normalize();
      move.set(0, 0, 0);
      for (const code of held) {
        const [x, z] = KEYS[code];
        move.addScaledVector(right, x).addScaledVector(forward, z);
      }
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(PAN_SPEED * dt);
        controls.target.add(move);
        camera.position.add(move);
      }
    }
    // Keep the orbit point over the map; move the camera with it so the view doesn't swing.
    const { x, z } = controls.target;
    const clampedX = THREE.MathUtils.clamp(x, bounds.minX, bounds.maxX);
    const clampedZ = THREE.MathUtils.clamp(z, bounds.minZ, bounds.maxZ);
    if (clampedX !== x || clampedZ !== z) {
      camera.position.x += clampedX - x;
      camera.position.z += clampedZ - z;
      controls.target.x = clampedX;
      controls.target.z = clampedZ;
    }
    const changed = controls.update(dt);
    // The orbit may dip below the deck to look up at it, but the camera never goes under the water.
    if (camera.position.y < CAMERA.minHeight) {
      camera.position.y = CAMERA.minHeight;
      camera.lookAt(controls.target);
    }
    return changed || held.size > 0;
  };

  const dispose = () => {
    controls.dispose();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
  return { update, dispose };
}

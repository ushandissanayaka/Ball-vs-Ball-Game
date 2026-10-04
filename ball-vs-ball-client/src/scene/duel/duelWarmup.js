import * as THREE from 'three';
import { createFightFx } from '../../effects/duelFx.js';
import { createBallModel } from '../../objects/duel/ballModels.js';
import { createFightProps } from '../../objects/duel/fightProps.js';
import { createAimArrow, createOrb } from '../../objects/duel/fightView.js';
import { BALL_IDS } from '../../shared/balls.js';
import { resolveFight } from '../../shared/duelSim.js';

/**
 * One of everything that only appears mid-duel (every ball, the Verity Ball's grim face, an orb, the aim
 * arrow, the hit effects), for warming up the renderer: see `warmUpRenderer`. Keep the
 * group in the scene, hidden, afterwards: dropping it would let WebGL throw the compiled shaders away again once
 * no material uses them.
 */
export function createDuelWarmup() {
  // One quick fight with every ball (each against the next), so the browser has compiled and optimised every
  // ball's code before the first real duel: run cold, a fight's first steps can take a noticeable moment.
  BALL_IDS.forEach((ball, i) => {
    const other = BALL_IDS[(i + 1) % BALL_IDS.length];
    resolveFight({ seed: i + 1, pink: { ball, aim: { x: 1, y: 0.2 } }, blue: { ball: other, aim: { x: -1, y: -0.2 } } });
  });
  const group = new THREE.Group();
  group.name = 'duel-warmup';
  for (const kind of BALL_IDS) {
    const model = createBallModel(kind, 7);
    model.setHp(100);
    model.setState({ frozen: true, webbed: true, burst: true, sick: true, charge: 1, transformed: false });
    model.update(0, 0); // turns the state shells on, so they are drawn (and compiled) too
    group.add(model.group);
  }
  const grim = createBallModel('verity', 7);
  grim.setState({ frozen: false, webbed: false, burst: false, charge: 0, transformed: true });
  group.add(grim.group);
  group.add(createOrb().group);
  group.add(createAimArrow().group);
  createFightFx(group);
  createFightProps(group).showAll();
  return group;
}

/**
 * Draws one frame with everything in the scene shown and nothing culled, then puts it all back. The first time a
 * material, texture or mesh is drawn, WebGL compiles its shader and uploads its data there and then, which can
 * freeze the game for a moment (shader compiles on Windows especially): this does all of that once, behind the
 * loading screen, instead of mid-duel. The baked sun shadows are left alone.
 * Every shader comes in two versions: one drawing straight to the screen (no bloom) and one drawing into the
 * bloom pass's HDR buffer. The quality (so whether bloom is on) can change after this runs (the player's saved
 * setting arrives a moment later), so both are made: through `draw` (the game's own path, bloom's passes and
 * all), straight to the screen, and into a small HDR target like bloom's.
 */
export function warmUpRenderer(renderer, scene, camera, draw) {
  const shown = [];
  const unculled = [];
  scene.traverse((object) => {
    if (!object.visible) {
      object.visible = true;
      shown.push(object);
    }
    if (object.frustumCulled) {
      object.frustumCulled = false;
      unculled.push(object);
    }
  });
  const shadowsDue = renderer.shadowMap.needsUpdate;
  renderer.shadowMap.needsUpdate = false;
  draw();
  renderer.render(scene, camera);
  const hdr = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  renderer.setRenderTarget(hdr);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  hdr.dispose();
  renderer.shadowMap.needsUpdate = shadowsDue;
  for (const object of shown) object.visible = false;
  for (const object of unculled) object.frustumCulled = true;
}

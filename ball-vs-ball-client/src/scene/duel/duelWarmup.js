import * as THREE from 'three';
import { createFightFx } from '../../effects/duelFx.js';
import { createBallModel, createTailSegment } from '../../objects/duel/ballModels.js';
import { createAimArrow, createOrb } from '../../objects/duel/fightView.js';
import { BALL_IDS } from '../../shared/balls.js';

/**
 * One of everything that only appears mid-duel (every ball, the Verity Ball's grim face, a snake tail
 * segment, an orb, the aim arrow, the hit effects), for warming up the renderer: see `warmUpRenderer`. Keep the
 * group in the scene, hidden, afterwards: dropping it would let WebGL throw the compiled shaders away again once
 * no material uses them.
 */
export function createDuelWarmup() {
  const group = new THREE.Group();
  group.name = 'duel-warmup';
  for (const kind of BALL_IDS) {
    const model = createBallModel(kind, 7);
    model.setHp(100);
    model.setState({ frozen: true, burning: true, charge: 1, transformed: false });
    group.add(model.group);
  }
  const grim = createBallModel('verity', 7);
  grim.setState({ frozen: false, burning: false, charge: 0, transformed: true });
  group.add(grim.group);
  group.add(createTailSegment().mesh);
  group.add(createOrb().group);
  group.add(createAimArrow().group);
  createFightFx(group);
  return group;
}

/**
 * Draws one frame with everything in the scene shown and nothing culled, through `draw` (the game's own render
 * path, so the shaders come out exactly as the game will use them), then puts it all back. The first time a
 * material, texture or mesh is drawn, WebGL compiles its shader and uploads its data there and then, which can
 * freeze the game for a moment (shader compiles on Windows especially): this does all of that once, behind the
 * loading screen, instead of mid-duel. The baked sun shadows are left alone.
 */
export function warmUpRenderer(renderer, scene, draw) {
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
  renderer.shadowMap.needsUpdate = shadowsDue;
  for (const object of shown) object.visible = false;
  for (const object of unculled) object.frustumCulled = true;
}

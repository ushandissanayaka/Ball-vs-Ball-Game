import * as THREE from 'three';
import { explosionSound, launchSound } from '../../audio/sfx.js';

// After the fight ends (ms): the winning ball stays on show alone in the box, then leaves it and lands on the
// loser's head. Its way there: `out` of the flight pops it out of the box toward the camera, then it arcs up
// `high` over the box's top and drops onto the head. (All inside the round's DUEL_TIMING.strikeMs.)
export const FLIGHT = { start: 1000, impact: 2300, out: 0.2, forward: 5, high: 9 };

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/**
 * The winning ball's flight onto the loser's head, for one arena: the duel's own players and every spectator
 * stage it the same way, from the same server times. `audible` strikes (one's own duel, or one being watched up
 * close) make their whoosh and blast.
 *   stage(now, fight, roundKey, fightView, loserCharacter)   call each frame of the fight phase
 *   impacted(roundKey)   whether this round's ball has landed (the loser's heart goes then)
 *   end()                drops a ball still in the air
 */
export function createStrike({ scene, camera, smoke }) {
  let key = null;
  let flight = null;
  let landed = false;
  const from = new THREE.Vector3();
  const out = new THREE.Vector3();
  const over = new THREE.Vector3();
  const drop = new THREE.Vector3();
  const to = new THREE.Vector3();

  const end = () => {
    flight?.model?.dispose();
    flight = null;
    key = null;
    landed = false;
  };

  const stage = (now, fight, roundKey, fightView, loser, { audible = true } = {}) => {
    if (key !== roundKey) {
      end();
      key = roundKey;
    }
    const since = now - fight.endsAt;
    if (since < FLIGHT.start || landed) return;
    if (!flight) {
      if (since > FLIGHT.impact + 600) {
        landed = true; // joined too late to see it fly: just count the hit
        return;
      }
      const model = fightView.takeStriker();
      if (model) scene.attach(model.group);
      const start = model ? model.group.position.clone() : null;
      // Out of the box's open face: toward the camera, level.
      const forward = start ? camera.position.clone().sub(start).setY(0).normalize().multiplyScalar(FLIGHT.forward) : null;
      flight = { model, from: start, forward, scale: model?.group.scale.x ?? 1 };
      if (model && audible) launchSound();
    }
    loser?.headPosition(to);
    const t = clamp01((since - FLIGHT.start) / (FLIGHT.impact - FLIGHT.start));
    const { model } = flight;
    if (model) {
      from.copy(flight.from);
      out.copy(from).add(flight.forward);
      if (t < FLIGHT.out) {
        // Pops out of the box.
        model.group.position.lerpVectors(from, out, smooth(t / FLIGHT.out));
      } else {
        // Up over the box's top and down onto the head, speeding up as it falls.
        const v = (t - FLIGHT.out) / (1 - FLIGHT.out);
        const u = smooth(v) * 0.4 + v * v * 0.6;
        const top = Math.max(out.y, to.y) + FLIGHT.high;
        over.set(out.x, top, out.z);
        drop.set(to.x, top, to.z);
        const a = (1 - u) ** 3;
        const b = 3 * u * (1 - u) ** 2;
        const c = 3 * u * u * (1 - u);
        model.group.position.set(0, 0, 0)
          .addScaledVector(out, a).addScaledVector(over, b).addScaledVector(drop, c).addScaledVector(to, u ** 3);
      }
      // Growing as it comes toward the camera, spinning.
      model.group.scale.setScalar(flight.scale * (1 + Math.sin(t * Math.PI) * 0.9));
      model.group.rotation.z -= 0.35;
    }
    if (t >= 1) {
      landed = true;
      if (audible) explosionSound();
      smoke.burst(to);
      loser?.flinch();
      model?.dispose();
      flight.model = null;
    }
  };

  const impacted = (roundKey) => key === roundKey && landed;
  return { stage, impacted, end, get flying() { return Boolean(flight?.model); } };
}

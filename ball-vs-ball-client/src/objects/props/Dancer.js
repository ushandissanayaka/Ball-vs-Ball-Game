import * as THREE from 'three';
import { createLegionPuppet } from '../player/LegionCharacter.js';

// A dancer on a hex pedestal: Bloxity's own Legion avatar (the players' body, in the Legion skin, with its full
// kit and shoes), floating over the pedestal and dancing. Its arms bend at the elbow and its legs at the knee, so
// the moves read like real dancing. Only a few bones turn each frame. The dance is a function of the time alone,
// so two dancers given the same time move exactly together.

const SIZE = 1.45; // the avatar is 6.4 tall; the pedestal holder scales it further

/** Returns { group, dance(seconds) }. Faces +z, feet at y = 0 (before it floats). */
export function createDancer(skinId = '0') {
  const group = new THREE.Group();
  group.name = 'dancer';
  group.userData.dynamic = true; // it moves: keep it out of the lobby's static batching
  const body = new THREE.Group(); // floats and spins inside `group`
  body.scale.setScalar(SIZE);
  group.add(body);
  const puppet = createLegionPuppet(skinId);
  body.add(puppet.group);
  const { pose } = puppet;

  const TAU = Math.PI * 2;
  const BEAT = 120 / 60; // beats per second (matches the music's pulse)
  /**
   * The dance at `seconds`, an 8-beat routine, the whole figure floating and gently rising and falling:
   *   1-4  bounce with knees bending, a fist pumping up in turn (elbow bent, then straightening), hips swaying
   *   5-6  the disco point: one arm straight up, the other bent across the chest, a knee lift
   *   7-8  a floating spin with both arms up, waving from the elbows
   */
  const dance = (seconds) => {
    const beat = seconds * BEAT;
    const phase = beat % 8;
    const b = beat % 1;
    const bounce = Math.abs(Math.sin(beat * Math.PI));
    body.position.y = 0.8 + Math.sin(seconds * 1.6) * 0.3 - bounce * 0.25; // floating over the pedestal
    body.rotation.y = 0;
    let legs = [[-bounce * 0.35, bounce * 0.7], [-bounce * 0.35, bounce * 0.7]]; // [hip pitch, knee pitch] L, R
    let spine = [0, 0, 0];
    let neck = [0, 0, 0];
    if (phase < 4) {
      const left = Math.floor(phase) % 2 === 0;
      const up = Math.sin(b * Math.PI);
      const s = left ? 1 : -1; // the side pumping: +1 left (+x), -1 right
      const pumpArm = left ? 'Arm L' : 'Arm R';
      const restArm = left ? 'Arm R' : 'Arm L';
      const [pumpShoulder, pumpElbow] = pumpArm === 'Arm L' ? ['ArmL1', 'ArmL2'] : ['ArmR1', 'ArmR2'];
      const [restShoulder, restElbow] = restArm === 'Arm L' ? ['ArmL1', 'ArmL2'] : ['ArmR1', 'ArmR2'];
      pose(pumpShoulder, 0, s * (1.2 + up * 1.5));
      pose(pumpElbow, 0, s * (1.5 - up * 1.3));
      pose(restShoulder, -0.3, -s * 0.25);
      pose(restElbow, -1.6, 0);
      spine = [0, Math.sin(beat * Math.PI) * 0.12, Math.sin(beat * Math.PI) * 0.18];
      neck = [0, -Math.sin(beat * Math.PI) * 0.15, 0];
    } else if (phase < 6) {
      const s = Math.floor(phase) % 2 === 0 ? 1 : -1;
      const [upShoulder, upElbow, acrossShoulder, acrossElbow] = s > 0 ? ['ArmL1', 'ArmL2', 'ArmR1', 'ArmR2'] : ['ArmR1', 'ArmR2', 'ArmL1', 'ArmL2'];
      pose(upShoulder, 0, s * 2.75);
      pose(upElbow, 0, 0);
      pose(acrossShoulder, -0.9, s * 0.2);
      pose(acrossElbow, -1.7, 0);
      spine = [0, s * 0.14, 0];
      neck = [0, 0, s * 0.4];
      const lift = Math.sin(b * Math.PI);
      legs[s > 0 ? 0 : 1] = [-lift * 1.1, lift * 1.5];
    } else {
      const t = (phase - 6) / 2;
      body.rotation.y = (t * t * (3 - 2 * t)) * TAU;
      body.position.y += Math.sin(t * Math.PI) * 0.9;
      const wave = Math.sin(beat * TAU * 2) * 0.5;
      pose('ArmL1', 0, 2.55);
      pose('ArmL2', 0, 0.4 + wave);
      pose('ArmR1', 0, -2.55);
      pose('ArmR2', 0, -0.4 - wave);
      legs = [[-0.4, 1.0], [0.15, 0.4]];
      neck = [-0.2, 0, 0];
    }
    pose('LegL1', legs[0][0]);
    pose('LegL2', legs[0][1]);
    pose('LegR1', legs[1][0]);
    pose('LegR2', legs[1][1]);
    pose('Spine1', 0, spine[1], spine[2]);
    pose('Neck1', neck[0], neck[1], neck[2]);
  };
  puppet.ready.then(() => dance(0));
  return { group, dance };
}

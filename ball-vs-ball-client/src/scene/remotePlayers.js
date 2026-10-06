import * as THREE from 'three';
import { CHARACTER_HEIGHT, createLegionCharacter, disposeCharacter } from '../objects/player/LegionCharacter.js';
import { createLabel } from '../util/canvasText.js';

// Everyone else walking about the lobby: their Legion characters, in their own skins, with their names over
// their heads. Positions arrive about ten times a second; in between, each glides toward its latest one and
// turns smoothly, its legs walking at the speed it moves, so movement looks continuous. A player standing on a
// duel square is shown by the arena instead (see scene/duel/arenaWatch.js), so they are hidden here meanwhile.
export const NAME_LIFT = 1.3; // the name floats this far over the head
const FOLLOW = 12; // how quickly a character catches up with its latest position (per second)
const SNAP = 40; // further than this from where it should be (a teleport, a respawn): jump straight there

const nameLines = (name) => [{ text: name, size: 64, fill: '#ffffff', stroke: '#14161c', strokeWidth: 10 }];
const turnToward = (from, to, t) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;

export function createRemotePlayers(scene, camera) {
  // Players the camera can't see still move along (so they're in the right place when looked at), but their
  // legs aren't posed and they don't ask for the frame to be redrawn: nothing on screen changed.
  const frustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const reach = new THREE.Sphere(new THREE.Vector3(), 6);
  const players = new Map(); // id -> { userId, name, character, label, target, yaw, speed, flags, placed }
  const head = new THREE.Vector3();
  let changed = false;

  const add = ({ id, userId, name, avatar, p }) => {
    if (players.has(id)) return;
    const character = createLegionCharacter(avatar ?? {});
    const label = createLabel(nameLines(name), { worldHeight: 1.7 });
    scene.add(character.group, label);
    const player = { userId: userId ?? null, name, character, label, target: new THREE.Vector3(), yaw: 0, speed: 0, flags: 0, placed: false };
    players.set(id, player);
    if (p) place(player, p);
    character.ready.then(() => { changed = true; });
  };

  const remove = (id) => {
    const player = players.get(id);
    if (!player) return;
    disposeCharacter(player.character);
    player.label.material.map?.dispose();
    player.label.material.dispose();
    player.label.removeFromParent();
    players.delete(id);
    changed = true;
  };

  function place(player, [x, y, z, yaw, speed, flags]) {
    player.target.set(x, y, z);
    player.yaw = yaw;
    player.speed = speed;
    player.flags = flags;
    const { group } = player.character;
    if (!player.placed || group.position.distanceTo(player.target) > SNAP) {
      group.position.copy(player.target);
      group.rotation.y = yaw;
      player.placed = true;
    }
  }

  const onJoin = (list) => { for (const entry of list) add(entry); };
  const onLeave = (id) => remove(id);
  const onState = (list) => {
    for (const [id, ...p] of list) {
      const player = players.get(id);
      if (player) place(player, p);
    }
  };
  const onReset = () => { for (const id of [...players.keys()]) remove(id); };

  /** Moves everyone along; true while anything moved (the frame needs drawing). */
  const update = (dt) => {
    let moving = changed;
    changed = false;
    const k = 1 - Math.exp(-FOLLOW * dt);
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    for (const player of players.values()) {
      const { group } = player.character;
      const seated = (player.flags & 2) !== 0;
      group.visible = !seated;
      player.label.visible = !seated;
      if (seated) continue;
      const gap = group.position.distanceTo(player.target);
      const turning = Math.abs(Math.atan2(Math.sin(player.yaw - group.rotation.y), Math.cos(player.yaw - group.rotation.y))) > 0.01;
      if (gap > 0.01) group.position.lerp(player.target, k);
      if (turning) group.rotation.y = turnToward(group.rotation.y, player.yaw, k);
      reach.center.copy(group.position).y += 3;
      if (!frustum.intersectsSphere(reach)) continue;
      player.character.update(dt, player.speed);
      player.character.headPosition(head);
      player.label.position.copy(head).y += NAME_LIFT;
      if (gap > 0.01 || turning || player.speed > 0.01) moving = true;
    }
    return moving;
  };

  /**
   * Where player `id`'s head is (into `target`), or false once they have gone. Seated players are drawn by their
   * arena, so for them it is worked out from where they last said they stand.
   */
  const headOf = (id, target) => {
    const player = players.get(id);
    if (!player) return false;
    if (player.character.group.visible) return player.character.headPosition(target);
    return target.copy(player.target).setY(player.target.y + CHARACTER_HEIGHT * 0.88);
  };

  /**
   * The character of the player a chat message came from: by their Bloxity account id, or (a guest) by name.
   * Null if they aren't here.
   */
  const characterOf = ({ userId, username }) => {
    let byName = null;
    for (const player of players.values()) {
      if (userId && player.userId === userId) return player.character;
      if (!byName && username && player.name === username) byName = player.character;
    }
    return byName;
  };

  return { onJoin, onLeave, onState, onReset, update, headOf, characterOf, get count() { return players.size; } };
}

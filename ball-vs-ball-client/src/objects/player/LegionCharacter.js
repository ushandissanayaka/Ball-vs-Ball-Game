import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { dotTexture } from '../../effects/glowTextures.js';
import { isTrustedSkinUrl, skinTextureUrl } from '../../shared/avatar.js';
import { CDN, applyProportions, avatarMaterial, captureRest, dressAvatar, loadPixelTexture, swapBodyParts, wearsBodyParts } from './avatarItems.js';

/*
 * The player's Legion (Bloxity) character: Bloxity's base avatar body (player.glb, the one the portal uses) dressed
 * as the player's avatar, from the Legion SDK: the skin texture (face, shirt and trousers drawn on it), swapped
 * body parts, proportions, and worn items (see avatarItems.js). It walks by swinging the hip and shoulder bones
 * each frame; one skinned character costs next to nothing to draw. If the avatar can't be loaded (offline,
 * blocked), a blocky stand-in in the same proportions takes its place.
 *
 * The model is 6.4 units tall with its feet at 0, facing +Z. It moves, so it casts no real shadow (the shadow map
 * is drawn once); a soft blob shadow sits under its feet instead. Its meshes are also on layer 1, so the headshot
 * camera can picture the character alone.
 */

export const CHARACTER_HEIGHT = 5.4;
const SCALE = CHARACTER_HEIGHT / 6.4;
export const HEADSHOT_LAYER = 1;

const loadSkin = (url) => loadPixelTexture(url, false); // GLB UVs

// The avatar body, downloaded and parsed once; every character wears a clone of it (opponents, players seen on
// the arenas), so another player appearing costs no new parse.
/**
 * The body's six parts (head, torso, arms, legs) share one skeleton, one material and one place, so they are
 * merged into a single skinned mesh: the same picture in one draw instead of six, for every character.
 */
function mergeParts(root, ownGeometry = false) {
  const parts = [];
  root.traverse((object) => { if (object.isSkinnedMesh) parts.push(object); });
  if (parts.length < 2 || parts.some((part) => part.skeleton !== parts[0].skeleton)) return root;
  const geometry = mergeGeometries(parts.map((part) => part.geometry));
  if (!geometry) return root;
  const [first] = parts;
  const merged = new THREE.SkinnedMesh(geometry, first.material);
  merged.name = 'avatar';
  merged.userData.ownGeometry = ownGeometry;
  first.parent.add(merged);
  merged.bind(first.skeleton, first.bindMatrix);
  for (const part of parts) part.removeFromParent();
  return root;
}

// A sphere round any pose the avatar takes (arms up, a spin, sat on the bike), in its own units: lets the
// renderer skip characters off screen without working out each pose's bounds.
const POSE_BOUNDS = new THREE.Sphere(new THREE.Vector3(0, 3.8, 0), 6.5);

// { parts: the body as downloaded (six parts, for avatars that swap some), merged: the same merged into one }
let avatarBody = null;
const loadBody = () => {
  avatarBody ??= new GLTFLoader().loadAsync(`${CDN}/player.glb`).then((gltf) => ({
    parts: cloneSkinned(gltf.scene),
    merged: mergeParts(gltf.scene),
  })).catch((error) => {
    avatarBody = null; // try again next time
    throw error;
  });
  return avatarBody;
};

/**
 * Bloxity's avatar body dressed as `spec` ({ equipped, proportions, skinUrl }): `root` holds `model` (the body,
 * `bones` by name) and any hand and shoe pairs; `tick` moves those pairs after each pose (or is null).
 */
async function loadAvatar(spec) {
  const equipped = spec?.equipped ?? {};
  const skinUrl = isTrustedSkinUrl(spec?.skinUrl) ? spec.skinUrl : skinTextureUrl(equipped);
  const [body, skin] = await Promise.all([
    loadBody(),
    loadSkin(skinUrl).catch(() => loadSkin(`${CDN}/skins/0.png`)),
  ]);
  let model;
  if (wearsBodyParts(equipped)) {
    model = cloneSkinned(body.parts);
    await swapBodyParts(model, equipped);
    mergeParts(model, true);
  } else {
    model = cloneSkinned(body.merged);
  }
  const material = avatarMaterial(skin);
  const bones = {};
  model.traverse((object) => {
    if (object.isBone) bones[object.name] = object;
    if (object.isMesh) {
      object.material = material;
      // Skinned bounds don't follow the pose: a fixed sphere round every pose is used instead, so characters
      // off screen are skipped.
      object.boundingSphere = POSE_BOUNDS.clone();
    }
  });
  const rest = captureRest(model, bones);
  const proportions = applyProportions(model, bones, spec?.proportions);
  const root = new THREE.Group();
  root.add(model);
  const tick = await dressAvatar(root, model, bones, rest, equipped, proportions);
  return { root, model, bones, tick };
}

/** The stand-in when the avatar can't be loaded: classic blocky body, same height. */
function blockyAvatar() {
  const model = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#f5cd9b', roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#2f6fe0', roughness: 0.6 });
  const pants = new THREE.MeshStandardMaterial({ color: '#2a2f40', roughness: 0.7 });
  const add = (parent, size, material, y) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  };
  add(model, [2.4, 2.4, 1.2], shirt, 3.6);
  add(model, [1.5, 1.5, 1.5], skin, 5.6);
  const limb = (x, y, material) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    add(pivot, [1.1, 2.4, 1.1], material, -1.2);
    model.add(pivot);
    return pivot;
  };
  const bones = { ArmL1: limb(1.8, 4.8, skin), ArmR1: limb(-1.8, 4.8, skin), LegL1: limb(0.6, 2.4, pants), LegR1: limb(-0.6, 2.4, pants) };
  return { root: model, model, bones, blocky: true };
}

/** Takes a character out of the scene and frees what is its own (the avatar body and the shadow dot are shared). */
export function disposeCharacter(character) {
  character.group.removeFromParent();
  character.group.traverse(disposeMesh);
}

/** Frees a mesh's own geometry, texture and material (not those every character, or every wearer of an item, shares). */
function disposeMesh(object) {
  if (!object.isMesh || object.userData.shared) return;
  if (!object.isSkinnedMesh || object.userData.ownGeometry) object.geometry.dispose();
  if (object.material.map !== dotTexture()) object.material.map?.dispose();
  object.material.dispose();
}

/**
 * The character. Returns { group, ready, update(dt, speed), headPosition(target), flinch(), setAvatar(spec) }: `group` sits at
 * the feet; `update` returns true on the frame a foot comes down while walking (for footstep sounds);
 * the feet and turns to face where it walks (`group.rotation.y`); `speed` 0..1 drives the walk cycle;
 * `flinch()` knocks it back for a moment (hit in a duel); `setAvatar(spec)` dresses it anew (the player changed
 * their avatar), resolving once the new look is on.
 */
export function createLegionCharacter(avatarSpec) {
  const group = new THREE.Group();
  group.name = 'player';
  const body = new THREE.Group();
  body.scale.setScalar(SCALE);
  group.add(body);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({ map: dotTexture(), color: '#000000', transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.06;
  group.add(shadow);

  let rig = null; // { bones, swing: [{ bone, rest, axis, sign, amount }], blocky, tick }
  const use = ({ root, model, bones, blocky, tick = null }) => {
    for (const old of [...body.children]) {
      old.removeFromParent();
      old.traverse(disposeMesh);
    }
    body.add(root);
    root.traverse((object) => { if (object.isMesh) object.layers.enable(HEADSHOT_LAYER); });
    model.updateMatrixWorld(true);
    // Each swinging bone turns about the model's own left-right (X) axis, expressed in its parent's space.
    const swing = [['LegL1', 1, 0.75], ['LegR1', -1, 0.75], ['ArmL1', -1, 0.6], ['ArmR1', 1, 0.6]].flatMap(([name, sign, amount]) => {
      const bone = bones[name];
      if (!bone) return [];
      const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      const modelWorld = model.getWorldQuaternion(new THREE.Quaternion());
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(modelWorld).applyQuaternion(parentWorld.invert());
      return [{ bone, rest: bone.quaternion.clone(), axis, sign, amount }];
    });
    rig = { bones, swing, blocky, tick };
  };
  use(blockyAvatar());
  // Only the latest look is put on (an older download finishing late is dropped).
  let wanted = 0;
  const setAvatar = (spec) => {
    const mine = (wanted += 1);
    return loadAvatar(spec).then((look) => {
      if (mine === wanted) use(look);
      else look.root.traverse(disposeMesh);
    }, (error) => {
      console.info('Legion avatar unavailable, using the stand-in:', error?.message ?? error);
    });
  };
  const ready = setAvatar(avatarSpec);

  let cycle = 0;
  let stride = 0;
  let flinchLeft = 0;
  const turn = new THREE.Quaternion();
  const update = (dt, speed) => {
    if (!rig) return false;
    stride += (speed - stride) * Math.min(1, dt * 10); // ease into and out of walking
    const before = Math.floor(cycle / Math.PI);
    cycle += dt * (4 + speed * 6);
    // A foot lands each half swing (when the bob is at its lowest).
    const footfall = Math.floor(cycle / Math.PI) !== before && stride > 0.3;
    for (const { bone, rest, axis, sign, amount } of rig.swing) {
      turn.setFromAxisAngle(axis, Math.sin(cycle) * amount * stride * sign);
      bone.quaternion.copy(turn).multiply(rest);
    }
    rig.tick?.(); // hand and shoe items follow the pose
    body.position.y = Math.abs(Math.sin(cycle)) * 0.18 * stride; // a little bob in each step
    // Knocked back: tips away from the hit and wobbles upright again.
    flinchLeft = Math.max(0, flinchLeft - dt);
    const k = flinchLeft / 0.7;
    body.rotation.x = -Math.sin(k * Math.PI) * 0.35 * k;
    body.rotation.z = Math.sin(k * 22) * 0.06 * k;
    return footfall;
  };
  const flinch = () => { flinchLeft = 0.7; };

  const head = new THREE.Vector3();
  /** World position of the middle of the head. */
  const headPosition = (target = head) => {
    const neck = rig?.bones.Neck1;
    if (neck && !rig.blocky) {
      neck.updateWorldMatrix(true, false);
      return neck.getWorldPosition(target).add(new THREE.Vector3(0, 0.65, 0));
    }
    return group.getWorldPosition(target).add(new THREE.Vector3(0, CHARACTER_HEIGHT * 0.88, 0));
  };

  return { group, ready, update, headPosition, flinch, setAvatar };
}

/**
 * A Legion figure to pose by hand (the lobby's dancers and the bike rider): Bloxity's avatar body in a Legion skin,
 * the same as the players', with every joint (shoulders, elbows, hips, knees, neck, spine) turned in the model's
 * own terms. Returns { group, ready, pose(name, pitch, roll, yaw) }: `pitch` swings a limb forward (-) or back
 * (+), `roll` out to the side (+ for the left side, at +x), `yaw` twists it. Joints: Spine1, Neck1, ArmL1, ArmL2,
 * ArmR1, ArmR2, LegL1, LegL2, LegR1, LegR2. It is 6.4 units tall with its feet at 0, facing +Z.
 */
export function createLegionPuppet(skinId = '0') {
  const group = new THREE.Group();
  group.userData.dynamic = true; // posed every frame: keep it out of static batching
  const joints = {};
  const qx = new THREE.Quaternion();
  const qz = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const ready = loadAvatar({ equipped: { skinId } }).then(({ model, bones }) => {
    group.add(model);
    model.updateMatrixWorld(true);
    const modelWorld = model.getWorldQuaternion(new THREE.Quaternion());
    for (const name of ['Spine1', 'Neck1', 'ArmL1', 'ArmL2', 'ArmR1', 'ArmR2', 'LegL1', 'LegL2', 'LegR1', 'LegR2']) {
      const bone = bones[name];
      if (!bone) continue;
      // The model's X, Y and Z axes as the bone's parent sees them (at rest).
      const toParent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(modelWorld);
      joints[name] = {
        bone, rest: bone.quaternion.clone(),
        x: new THREE.Vector3(1, 0, 0).applyQuaternion(toParent),
        y: new THREE.Vector3(0, 1, 0).applyQuaternion(toParent),
        z: new THREE.Vector3(0, 0, 1).applyQuaternion(toParent),
      };
    }
  }).catch((error) => console.info('Legion avatar unavailable for a lobby figure:', error?.message ?? error));
  const pose = (name, pitch = 0, roll = 0, yaw = 0) => {
    const joint = joints[name];
    if (!joint) return;
    qx.setFromAxisAngle(joint.x, pitch);
    qz.setFromAxisAngle(joint.z, roll);
    qy.setFromAxisAngle(joint.y, yaw);
    joint.bone.quaternion.copy(qy).multiply(qz).multiply(qx).multiply(joint.rest);
  };
  return { group, ready, pose };
}

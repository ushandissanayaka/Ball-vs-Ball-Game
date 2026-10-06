import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { cleanProportions, isEquipped } from '../../shared/avatar.js';

/*
 * What a Bloxity avatar wears beyond its skin, on Bloxity's base body (player.glb): swapped body parts, its
 * proportions, and its items (hat, hair, mask, back, and the neck, chest, waist, hand and shoe accessories),
 * placed the way the Bloxity portal places them. Each item's mesh and texture download once and every
 * character wearing it shares them.
 */

export const CDN = 'https://static.bloxity.io/avatars';

// ---- Shared downloads ---------------------------------------------------------------------------------------
const cache = new Map();
/** `load()` once per `key`; a failed download is forgotten, so the next character tries again. */
function once(key, load) {
  if (!cache.has(key)) cache.set(key, load().catch((error) => { cache.delete(key); throw error; }));
  return cache.get(key);
}

export async function loadPixelTexture(url, flipY = true) {
  const texture = await new THREE.TextureLoader().setCrossOrigin('anonymous').loadAsync(url);
  texture.flipY = flipY;
  texture.magFilter = THREE.NearestFilter; // crisp pixel-art textures
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The look of the body itself (see LegionCharacter.js): items are lit the same way. */
export const avatarMaterial = (map) => new THREE.MeshStandardMaterial(
  map ? { map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.25 } : { color: 0xdddddd, roughness: 0.7 },
);

/** An item's mesh in its texture (`dir`: hats, back, neck, chest, waist, hand, shoes), shared by everyone wearing it. */
const itemTemplate = (dir, id) => once(`item:${dir}/${id}`, async () => {
  const [object, map] = await Promise.all([
    new OBJLoader().loadAsync(`${CDN}/items/${dir}/${id}.obj`),
    loadPixelTexture(`${CDN}/textures/${dir}/${id}.png`).catch(() => null),
  ]);
  const material = avatarMaterial(map);
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.userData.shared = true; // not freed with one character (see disposeCharacter)
  });
  return object;
});
const loadItem = async (dir, id) => (await itemTemplate(dir, id)).clone();

const partGltf = (dir, file) => once(`part:${dir}/${file}`, () => new GLTFLoader().loadAsync(`${CDN}/parts/${dir}/${file}.glb`));

// ---- Body parts --------------------------------------------------------------------------------------------
const PARTS = [
  ['headId', 'head', '', 'default_head'],
  ['torsoId', 'torso', '', 'default_torso'],
  ['armLId', 'arms', '_L', 'default_arm_L'],
  ['armRId', 'arms', '_R', 'default_arm_R'],
  ['legLId', 'legs', '_L', 'default_leg_L'],
  ['legRId', 'legs', '_R', 'default_leg_R'],
];

export const wearsBodyParts = (equipped) => PARTS.some(([slot]) => isEquipped(equipped?.[slot]));

/**
 * Puts the worn head, torso, arms and legs in place of the default ones on `model` (an unmerged clone of the
 * body), re-pointing each part's bone indices at the body's own skeleton. A part that can't be loaded stays default.
 */
export async function swapBodyParts(model, equipped) {
  const meshes = new Map();
  model.traverse((object) => { if (object.isSkinnedMesh) meshes.set(object.name.toLowerCase(), object); });
  await Promise.all(PARTS.filter(([slot]) => isEquipped(equipped?.[slot])).map(async ([slot, dir, suffix, meshName]) => {
    const target = meshes.get(meshName.toLowerCase());
    if (!target) return;
    try {
      const gltf = await partGltf(dir, `${equipped[slot]}${suffix}`);
      let part = null;
      gltf.scene.traverse((object) => { if (object.isSkinnedMesh && !part) part = object; });
      if (!part) return; // an unskinned part would not follow the bones
      const geometry = part.geometry.clone();
      const byName = new Map(target.skeleton.bones.map((bone, i) => [bone.name, i]));
      const remap = part.skeleton.bones.map((bone) => byName.get(bone.name));
      const indices = geometry.getAttribute('skinIndex');
      if (indices) {
        for (let i = 0; i < indices.array.length; i += 1) {
          const mapped = remap[indices.array[i]];
          if (mapped !== undefined) indices.array[i] = mapped;
        }
        indices.needsUpdate = true;
      }
      target.geometry = geometry;
      target.userData.ownGeometry = true;
    } catch (error) {
      console.info(`Bloxity ${dir} part ${equipped[slot]} unavailable:`, error?.message ?? error);
    }
  }));
}

// ---- Proportions -------------------------------------------------------------------------------------------
const UPPER_BODY = new Set(['Spine2', 'ArmL_Offset', 'ArmL1', 'ArmL2', 'ArmR_Offset', 'ArmR1', 'ArmR2', 'Neck_Offset', 'Neck1']);
const SPREAD = 0.8;

/** Widens the torso and moves the arms and legs apart by changing what the skeleton hands the GPU (as the portal does). */
function spreadSkeleton(skeleton, { shoulderWidth: sw, legOffsetX: lox, torsoScaleX: tsx }) {
  const bindX = new Map(skeleton.bones.map((bone, i) => [bone.name, new THREE.Vector3().setFromMatrixPosition(skeleton.boneInverses[i].clone().invert()).x]));
  const spineX = bindX.get('Spine1') ?? 0;
  const update = skeleton.update.bind(skeleton);
  skeleton.update = function spreadUpdate() {
    update();
    const m = this.boneMatrices;
    this.bones.forEach(({ name }, i) => {
      const o = i * 16;
      if ((name === 'Spine1' || name === 'Spine2') && tsx !== 1) {
        m[o] *= tsx; m[o + 1] *= tsx; m[o + 2] *= tsx; m[o + 3] *= tsx;
      }
      if (UPPER_BODY.has(name) && tsx !== 1) m[o + 12] += ((bindX.get(name) ?? spineX) - spineX) * (tsx - 1) * SPREAD;
      if (sw !== 1 && name.startsWith('Arm')) m[o + 12] += (bindX.get(name.startsWith('ArmL') ? 'ArmL_Offset' : 'ArmR_Offset') ?? 0) * (sw - 1) * SPREAD;
      if (lox !== 1 && name.startsWith('Leg')) m[o + 12] += (bindX.get(name.startsWith('LegL') ? 'LegL_Offset' : 'LegR_Offset') ?? 0) * (lox - 1) * SPREAD;
    });
  };
}

/** Shapes `model` to the avatar's proportions (height, arm length, head size, neck, shoulders, legs, torso). */
export function applyProportions(model, bones, proportions) {
  const p = cleanProportions(proportions);
  const skeletons = new Set();
  model.traverse((object) => { if (object.isSkinnedMesh) skeletons.add(object.skeleton); });
  const [skeleton] = skeletons;
  if (!skeleton) return p;
  const { height: h, armLength: al, headScale: hs, neckHeight: nh } = p;
  model.scale.y *= h;
  const neckIndex = skeleton.bones.findIndex((bone) => bone.name === 'Neck_Offset');
  const neckBindY = neckIndex >= 0 ? skeleton.boneInverses[neckIndex].clone().invert().elements[13] : 0;
  for (const bone of Object.values(bones)) {
    if (bone.name.startsWith('Arm')) bone.scale.y *= al;
    if (bone.name === 'Neck_Offset') bone.position.y += (h - hs) * bone.position.y + neckBindY * (nh - 1) * SPREAD;
    if (bone.name === 'Neck1') bone.scale.set(bone.scale.x * hs, bone.scale.y * (hs / h), bone.scale.z * hs);
  }
  if (p.shoulderWidth !== 1 || p.legOffsetX !== 1 || p.torsoScaleX !== 1) for (const each of skeletons) spreadSkeleton(each, p);
  return p;
}

// ---- Items -------------------------------------------------------------------------------------------------
/**
 * Each bone's rest transform, inverted, in the model's own space: taken straight after loading (before any pose
 * or proportions). Accessories are placed with these, not the skeleton's bind inverses (the leaf bones' are 90
 * degrees off their rest pose).
 */
export function captureRest(model, bones) {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const rest = {};
  for (const [name, bone] of Object.entries(bones)) rest[name] = toModel.clone().multiply(bone.matrixWorld).invert();
  return rest;
}

const HEAD_ITEMS = ['hatId', 'hairId', 'maskId']; // all from /items/hats, worn together
const TORSO_ITEMS = [['neckId', 'neck', 'Spine2', 4.8], ['chestId', 'chest', 'Spine2', 3.6], ['waistId', 'waist', 'Spine1', 2.4]];
const PAIRS = [['handId', 'hand', 'ArmL2_leaf', 'ArmR2_leaf'], ['shoesId', 'shoes', 'LegL2_leaf', 'LegR2_leaf']];

/**
 * Puts the avatar's items on `model` (and its hand and shoe pairs in `root`, the model's parent). Resolves to a
 * function to call after each pose, which moves the pairs along (null when none are worn).
 */
export async function dressAvatar(root, model, bones, rest, equipped, proportions) {
  const { torsoScaleX: tsx, shoulderWidth: sw, legOffsetX: lox } = proportions;
  const worn = (slot) => isEquipped(equipped?.[slot]);
  const tryLoad = (dir, id) => loadItem(dir, id).catch((error) => {
    console.info(`Bloxity ${dir} item ${id} unavailable:`, error?.message ?? error);
    return null;
  });

  const jobs = [];
  // Hat, hair and mask: on the head bone, 0.8 above it.
  const neck = bones.Neck1;
  for (const slot of HEAD_ITEMS.filter(worn)) {
    jobs.push(tryLoad('hats', equipped[slot]).then((item) => {
      if (!item || !neck) return;
      item.position.set(0, 0.8, 0);
      neck.add(item);
    }));
  }
  // Back item: on the upper spine.
  if (worn('backId') && bones.Spine2) {
    jobs.push(tryLoad('back', equipped.backId).then((item) => { if (item) bones.Spine2.add(item); }));
  }
  // Neck, chest and waist: under their bone, at their place on the body at rest (widened with the torso).
  for (const [slot, dir, boneName, y] of TORSO_ITEMS.filter(([slot]) => worn(slot))) {
    const bone = bones[boneName];
    if (!bone || !rest[boneName]) continue;
    jobs.push(tryLoad(dir, equipped[slot]).then((item) => {
      if (!item) return;
      item.matrixAutoUpdate = false;
      item.matrix.copy(rest[boneName]).multiply(new THREE.Matrix4().makeScale(tsx, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(0, y, 0));
      bone.add(item);
    }));
  }
  // Hands and shoes: worn as a pair, the right one a mirror of the left. They follow their bone's place and turn
  // but not its scale, so they sit in `root` and are moved after each pose.
  const pairs = [];
  for (const [slot, dir, leftName, rightName] of PAIRS.filter(([slot]) => worn(slot))) {
    const spread = dir === 'hand' ? SPREAD * (2 * (sw - 1) + 2 * (tsx - 1)) : SPREAD * 0.6 * (lox - 1);
    jobs.push(tryLoad(dir, equipped[slot]).then((left) => {
      if (!left) return;
      for (const [name, side, item] of [[leftName, 1, left], [rightName, -1, left.clone()]]) {
        const bone = bones[name];
        if (!bone || !rest[name]) continue;
        const local = rest[name].clone();
        if (side < 0) local.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
        item.matrixAutoUpdate = false;
        root.add(item);
        pairs.push({ item, bone, local, shift: side * spread });
      }
    }));
  }
  await Promise.all(jobs);
  if (!pairs.length) return null;

  const toRoot = new THREE.Matrix4();
  const boneInRoot = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);
  return () => {
    root.updateWorldMatrix(true, false);
    model.updateMatrixWorld(true);
    toRoot.copy(root.matrixWorld).invert();
    for (const { item, bone, local, shift } of pairs) {
      boneInRoot.multiplyMatrices(toRoot, bone.matrixWorld).decompose(position, turn, scale);
      position.x += shift;
      item.matrix.compose(position, turn, ONE).multiply(local);
      item.matrixWorldNeedsUpdate = true;
    }
  };
}

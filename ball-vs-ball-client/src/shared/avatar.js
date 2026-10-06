// A Bloxity avatar as it travels between players: the item worn in each slot and the body's proportions. The
// client cleans its own before sending it; the server cleans what it is sent before passing it on.
// The client and the server each keep a copy of this file: change both together.

/** Every slot the Legion SDK's avatar.getEquipped() names. */
export const AVATAR_SLOTS = [
  'skinId', 'hatId', 'hairId', 'maskId', 'backId', 'headId', 'torsoId', 'armLId', 'armRId', 'legLId', 'legRId',
  'neckId', 'chestId', 'waistId', 'handId', 'shoesId', 'faceId', 'pantsId', 'shirtId',
];

/** Each proportion's range (the SDK clamps to the same); 1 is the default body. */
export const PROPORTION_RANGES = {
  height: [0.5, 1.6],
  shoulderWidth: [0.5, 1.5],
  armLength: [0.05, 3],
  legOffsetX: [-0.7, 5],
  torsoScaleX: [0.3, 2],
  neckHeight: [0.94, 1.2],
  headScale: [0.3, 2.6],
};

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** True for a real item id: '-1', '', 'undefined' and null all mean nothing is worn there. */
export function isEquipped(id) {
  const text = typeof id === 'number' ? String(id) : id;
  return typeof text === 'string' && ID.test(text) && text !== '-1' && text !== 'undefined' && text !== 'null';
}

/** Only the slots with a real item, as strings. */
export function cleanEquipped(equipped) {
  const clean = {};
  for (const slot of AVATAR_SLOTS) if (isEquipped(equipped?.[slot])) clean[slot] = String(equipped[slot]);
  return clean;
}

/** Every proportion, clamped to its range (1 where missing or not a number). */
export function cleanProportions(proportions) {
  const clean = {};
  for (const [key, [min, max]] of Object.entries(PROPORTION_RANGES)) {
    const value = Number(proportions?.[key]);
    clean[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 1;
  }
  return clean;
}

/**
 * The body texture for `equipped`: Bloxity draws the worn face, shirt and trousers onto the skin
 * (s{skin}[_pn{pants}][_sh{shirt}][_fc{face}].png); with none of those, the plain skin.
 */
export function skinTextureUrl(equipped) {
  const skin = isEquipped(equipped?.skinId) ? String(equipped.skinId) : '0';
  const layers = [['pantsId', 'pn'], ['shirtId', 'sh'], ['faceId', 'fc']]
    .filter(([slot]) => isEquipped(equipped?.[slot]))
    .map(([slot, tag]) => `_${tag}${equipped[slot]}`)
    .join('');
  return layers
    ? `https://api.bloxity.io/v1/avatar/skin-texture/s${skin}${layers}.png`
    : `https://static.bloxity.io/avatars/skins/${skin}.png`;
}

/** Only Bloxity's own hosts may supply a skin texture URL. */
export const isTrustedSkinUrl = (url) =>
  typeof url === 'string' && url.length < 300 && /^https:\/\/(api|static)\.bloxity\.io\/[\w./-]+\.png$/.test(url);

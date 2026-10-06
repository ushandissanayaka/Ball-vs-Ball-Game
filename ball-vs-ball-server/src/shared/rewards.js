import { utcDayKey } from './constants.js';
import { KINDS } from './catalog.js';
import { BALL_IDS } from './balls.js';

// Daily rewards, the daily store, crates, Daily Diamonds and the inventory. The server applies these to saved profiles; the client
// applies the same rules to its own copy when the server can't be reached.
// The client and the server each keep a copy of this file: change both together.

const DAY = 24 * 3600_000;

/** The 7-day reward track, in order: coins, or a ball (a key of the inventory catalog). */
export const DAILY_REWARDS = [
  { coins: 100 },
  { ball: 'bomb' },
  { coins: 100 },
  { coins: 100 },
  { coins: 150 },
  { coins: 100 },
  { ball: 'potion' },
];

/** Today's store. `price` is { coins } or { bux } (bux items are bought through the portal, not here). */
export const DAILY_STORE = [
  { id: 'cannon', kind: 'ball', name: 'Cannon Ball', price: { bux: 149 } },
  { id: 'thornbeam_amber', kind: 'explosion', name: 'Thornbeam Amber', price: { bux: 69 } },
  { id: 'sixty_seven', kind: 'flyer', name: '67', price: { bux: 149 } },
  { id: 'virus', kind: 'ball', name: 'Virus Ball', price: { coins: 1200 } },
];

export const LIMITED_BUNDLE = {
  id: 'lightwing', name: 'Lightwing', contents: 'Ball + Explosion + Flyer', price: { bux: 1599 }, days: 14,
  ballOnly: { id: 'lightwing', name: 'Lightwing Ball', price: { bux: 799 } },
  items: [
    { kind: 'ball', id: 'lightwing', name: 'Lightwing Ball' },
    { kind: 'explosion', id: 'lightwing_volley', name: 'Lightwing Volley' },
    { kind: 'flyer', id: 'lightwing_wings', name: 'Lightwing' },
  ],
};

/**
 * The store's crates (Balls, Explosions and Flyers tabs), a coin one and a diamond one each. `odds` are
 * percentages by rarity; a prize is any item of its kind with the rarity rolled (mythics never come from crates).
 */
export const CRATES = {
  ball_coins: { kind: 'ball', name: 'Coins Ball Gacha', currency: 'coins', price: 600, tradable: false, odds: { rare: 79, epic: 19, legendary: 2 } },
  ball_gems: { kind: 'ball', name: 'Diamonds Ball Gacha', currency: 'gems', price: 60, tradable: true, odds: { rare: 58, epic: 33, legendary: 9 } },
  explosion_coins: { kind: 'explosion', name: 'Coins Explosion Crate', currency: 'coins', price: 300, tradable: true, odds: { uncommon: 87, rare: 10, epic: 2.5, legendary: 0.5 } },
  explosion_gems: { kind: 'explosion', name: 'Diamonds Explosion Crate', currency: 'gems', price: 30, tradable: true, odds: { rare: 79, epic: 18, legendary: 3 } },
  flyer_coins: { kind: 'flyer', name: 'Coins Flyer Crate', currency: 'coins', price: 1000, tradable: true, odds: { uncommon: 87, rare: 10, epic: 2.5, legendary: 0.5 } },
  flyer_gems: { kind: 'flyer', name: 'Diamonds Flyer Crate', currency: 'gems', price: 100, tradable: true, odds: { rare: 79, epic: 18, legendary: 3 } },
};

/** Diamond packs (bought with bux through the portal). `bonus` is the extra percentage shown on the pack. */
export const GEM_PACKS = [
  { gems: 100, bux: 99 }, { gems: 400, bux: 399 }, { gems: 800, bux: 759, bonus: 5 },
  { gems: 2000, bux: 1699, bonus: 18 }, { gems: 5500, bux: 4499, bonus: 22 }, { gems: 13000, bux: 9999, bonus: 30 },
];

/** Free diamonds, once a UTC day. */
export const DAILY_GEMS = 10;

/** Balls every new guest owns (ball → how many). */
export const STARTER_BALLS = { verity: 1, thief: 1, axe: 1, electric: 2, vampire: 1, burst: 1, cell: 1, charge: 1, spider: 1 };

export const newDailyState = (now) => ({ start: utcDayKey(now), claimed: [] });

/** Fills in the inventory and reward track on profiles saved before they existed. Returns true if it did. */
export function ensureInventory(profile, now) {
  let changed = false;
  if (!profile.balls) { profile.balls = { ...STARTER_BALLS }; changed = true; }
  if (!profile.daily) { profile.daily = newDailyState(now); changed = true; }
  if (!profile.explosions) { profile.explosions = {}; changed = true; }
  if (!profile.flyers) { profile.flyers = {}; changed = true; }
  if (!profile.variants) { profile.variants = {}; changed = true; }
  return changed;
}

/** Days unlocked on the track: one on the first day, one more each UTC day after (up to 7). */
function unlockedDays(daily, now) {
  const days = Math.floor((Date.parse(utcDayKey(now)) - Date.parse(daily.start)) / DAY);
  return Math.min(DAILY_REWARDS.length, Math.max(0, days) + 1);
}

/** Starts the track over once all 7 rewards have been claimed and a new day has come. Returns true if it did. */
export function refreshDaily(profile, now) {
  const { daily } = profile;
  if (daily.claimed.length < DAILY_REWARDS.length || daily.lastClaimDay === utcDayKey(now)) return false;
  profile.daily = newDailyState(now);
  return true;
}

/** The track as the HUD shows it: { start, claimed (day numbers), unlocked (how many days), nextUnlockAt }. */
export function publicDaily(daily, now) {
  return {
    start: daily.start,
    claimed: [...daily.claimed],
    lastClaimDay: daily.lastClaimDay ?? null,
    unlocked: unlockedDays(daily, now),
    nextUnlockAt: Date.parse(utcDayKey(now)) + DAY,
  };
}

/** Gives one of item `id` (of `kind`: 'ball', 'explosion' or 'flyer'). */
function addItem(profile, kind, id) {
  const { key } = KINDS[kind];
  profile[key] = { ...profile[key], [id]: (profile[key]?.[id] ?? 0) + 1 };
}

/** Claims day `day` (1-7) of the track. Returns null, or why it can't ('locked', 'claimed'). */
export function claimDailyReward(profile, day, now) {
  const reward = DAILY_REWARDS[day - 1];
  if (!Number.isInteger(day) || !reward || day > unlockedDays(profile.daily, now)) return 'locked';
  if (profile.daily.claimed.includes(day)) return 'claimed';
  profile.daily = { ...profile.daily, claimed: [...profile.daily.claimed, day].sort((a, b) => a - b), lastClaimDay: utcDayKey(now) };
  if (reward.coins) profile.coins += reward.coins;
  if (reward.ball) addItem(profile, 'ball', reward.ball);
  return null;
}

/** Buys a coin-priced store item. Returns null, or why it can't ('unknown', 'bux', 'coins'). */
export function buyStoreItem(profile, itemId) {
  const item = DAILY_STORE.find((entry) => entry.id === itemId);
  if (!item) return 'unknown';
  if (!item.price.coins) return 'bux';
  if (profile.coins < item.price.coins) return 'coins';
  profile.coins -= item.price.coins;
  addItem(profile, item.kind, item.id);
  return null;
}

/**
 * Gems products: what is sold for Bloxity Gems, by sku (the id Bloxity's catalog lists it under; Bloxity sets the
 * price). 'gems_<n>' is a diamond pack, 'ball_<ball>' unlocks a ball before its level, and the rest are the
 * Daily Store's Gems items and the limited bundle.
 */
export const gemPackSku = (pack) => `gems_${pack.gems}`;
export const earlyBallSku = (ball) => `ball_${ball}`;
export const BUNDLE_SKU = `${LIMITED_BUNDLE.id}_bundle`;
export const BUNDLE_BALL_SKU = `${LIMITED_BUNDLE.ballOnly.id}_ball`;

/**
 * Gives what Gems product `sku` buys (once Bloxity has taken the Gems). Returns null, or 'unknown' for a sku this
 * game doesn't sell.
 */
export function grantPurchase(profile, sku) {
  const pack = GEM_PACKS.find((entry) => gemPackSku(entry) === sku);
  if (pack) {
    profile.gems += pack.gems;
    return null;
  }
  const item = DAILY_STORE.find((entry) => entry.id === sku && entry.price.bux);
  if (item) {
    addItem(profile, item.kind, item.id);
    return null;
  }
  if (sku === BUNDLE_SKU) {
    for (const entry of LIMITED_BUNDLE.items) addItem(profile, entry.kind, entry.id);
    return null;
  }
  if (sku === BUNDLE_BALL_SKU) {
    addItem(profile, 'ball', LIMITED_BUNDLE.ballOnly.id);
    return null;
  }
  const ball = typeof sku === 'string' && sku.startsWith('ball_') ? sku.slice(5) : null;
  if (ball && BALL_IDS.includes(ball)) {
    if (!profile.boughtBalls?.includes(ball)) profile.boughtBalls = [...(profile.boughtBalls ?? []), ball];
    return null;
  }
  return 'unknown';
}

/** One prize from `crate`: a rarity by its odds, then any item of that rarity. `random` returns 0..1. */
function rollPrize(crate, random) {
  const odds = Object.entries(crate.odds);
  let pick = random() * odds.reduce((sum, [, chance]) => sum + chance, 0);
  let rarity = odds[odds.length - 1][0];
  for (const [name, chance] of odds) {
    if (pick < chance) { rarity = name; break; }
    pick -= chance;
  }
  const { items } = KINDS[crate.kind];
  const pool = Object.keys(items).filter((id) => items[id].rarity === rarity);
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Opens `crateId` `count` times (1 or 10). Returns { prizes: [item ids] }, or { error } ('unknown', 'coins',
 * 'gems' when there is not enough to pay).
 */
export function openCrate(profile, crateId, count, random = Math.random) {
  const crate = CRATES[crateId];
  if (!crate || (count !== 1 && count !== 10)) return { error: 'unknown' };
  const cost = crate.price * count;
  if ((profile[crate.currency] ?? 0) < cost) return { error: crate.currency };
  profile[crate.currency] -= cost;
  const prizes = Array.from({ length: count }, () => rollPrize(crate, random));
  for (const id of prizes) addItem(profile, crate.kind, id);
  return { prizes };
}

/** Claims today's free diamonds. Returns null, or 'claimed' if they were already claimed today. */
export function claimDailyGems(profile, now) {
  const today = utcDayKey(now);
  if (profile.gemsDay === today) return 'claimed';
  profile.gemsDay = today;
  profile.gems += DAILY_GEMS;
  return null;
}

/** How many it takes to fuse or upgrade into one of the next variant. */
export const FUSE_COST = 3;

const variantKey = (kind, id) => `${kind}:${id}`;

/** Shiny and rainbow copies of an item: { shiny, rainbow }. */
export const variantsOf = (profile, kind, id) => ({ shiny: 0, rainbow: 0, ...profile.variants?.[variantKey(kind, id)] });

/** Every copy of an item a player owns: classic, shiny and rainbow. */
export function ownedCount(profile, kind, id) {
  const { shiny, rainbow } = variantsOf(profile, kind, id);
  return (profile[KINDS[kind].key]?.[id] ?? 0) + shiny + rainbow;
}

/**
 * What fusing or upgrading turns into what: Fusion turns 3 classic balls into a Shiny one; Upgrade turns 3 Shiny
 * balls into a Rainbow one, and 3 classic flyers or explosions into a Shiny one. Returns { from, to }.
 */
export function fuseStep(kind, mode) {
  if (mode === 'upgrade' && kind === 'ball') return { from: 'shiny', to: 'rainbow' };
  return { from: 'classic', to: 'shiny' };
}

/** Fuses (mode 'fuse', balls only) or upgrades an item. Returns null, or why it can't ('unknown', 'few'). */
export function fuseItem(profile, kind, id, mode) {
  if (!KINDS[kind] || !Object.hasOwn(KINDS[kind].items, id) || !['fuse', 'upgrade'].includes(mode)) return 'unknown';
  if (mode === 'fuse' && kind !== 'ball') return 'unknown';
  const { from, to } = fuseStep(kind, mode);
  const { key } = KINDS[kind];
  const variants = variantsOf(profile, kind, id);
  const have = from === 'classic' ? profile[key]?.[id] ?? 0 : variants[from];
  if (have < FUSE_COST) return 'few';
  if (from === 'classic') profile[key] = { ...profile[key], [id]: have - FUSE_COST };
  else variants[from] -= FUSE_COST;
  variants[to] += 1;
  profile.variants = { ...profile.variants, [variantKey(kind, id)]: variants };
  return null;
}

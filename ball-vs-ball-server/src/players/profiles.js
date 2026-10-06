import { randomUUID } from 'node:crypto';
import { STARTER_PROFILE } from '../shared/lobbySeed.js';
import { getProfile, setProfile } from '../progress/profileStore.js';
import { questStates, refreshDailyQuests } from '../progress/quests.js';
import { allowedBalls, levelInfo } from '../shared/levels.js';
import { STARTER_BALLS, ensureInventory, newDailyState, publicDaily, refreshDaily } from '../shared/rewards.js';

const GUEST_ID = /^[a-zA-Z0-9-]{8,64}$/;

const starterBoost = (now) => {
  const boost = STARTER_PROFILE.coinBoost;
  return boost ? { multiplier: boost.multiplier, endsAt: now + boost.durationSec * 1000 } : null;
};

function newProfile(now) {
  return {
    version: STARTER_PROFILE.version,
    createdAt: now,
    coins: STARTER_PROFILE.coins,
    gems: STARTER_PROFILE.gems,
    wins: 0,
    boughtBalls: [],
    coinBoost: starterBoost(now),
    questDay: null,
    questProgress: { ...STARTER_PROFILE.questProgress },
    balls: { ...STARTER_BALLS },
    daily: newDailyState(now),
  };
}

/**
 * The guest's saved profile, or a new one (with a new id) when the id is missing, malformed or unknown. A save
 * from an older starter version is started over at zero (same guest id).
 */
export function getOrCreateProfile(requestedId, now) {
  const saved = typeof requestedId === 'string' && GUEST_ID.test(requestedId) ? getProfile(requestedId) : null;
  const guestId = saved ? requestedId : randomUUID();
  return { guestId, profile: freshen(guestId, saved, now) };
}

/** The save as it is played now: a new one for a missing or older-version save, with anything new filled in. */
function freshen(key, saved, now) {
  const current = saved?.version === STARTER_PROFILE.version;
  const profile = current ? saved : newProfile(now);
  // Saves from before levels: count from no wins.
  if (typeof profile.wins !== 'number') profile.wins = 0;
  if (!Array.isArray(profile.boughtBalls)) profile.boughtBalls = [];
  const changed = [refreshDailyQuests(profile, now), ensureInventory(profile, now), refreshDaily(profile, now)].some(Boolean);
  if (!current || changed) setProfile(key, profile);
  return profile;
}

/** Where a Bloxity account's progress is saved (guest ids can't take this form: GUEST_ID has no ':'). */
export const accountKey = (accountId) => `legion:${accountId}`;

/**
 * A Bloxity account's saved profile: { key, profile }. The first time an account signs in it takes over the
 * progress the player made as guest `guestId` on this device (each guest's progress goes to one account only).
 */
export function getOrCreateAccountProfile(accountId, guestId, now) {
  const key = accountKey(accountId);
  let saved = getProfile(key);
  if (!saved) {
    const guest = typeof guestId === 'string' && GUEST_ID.test(guestId) ? getProfile(guestId) : null;
    if (guest && !guest.adoptedBy && guest.version === STARTER_PROFILE.version) {
      saved = structuredClone(guest);
      guest.adoptedBy = key;
      setProfile(guestId, guest);
    }
  }
  return { key, profile: freshen(key, saved, now) };
}

/** @returns {import('../shared/types.js').PublicProfile} */
export function publicProfile(profile, now) {
  const boost = profile.coinBoost && profile.coinBoost.endsAt > now ? profile.coinBoost : null;
  return {
    coins: profile.coins, gems: profile.gems, ...levelInfo(profile.wins), boughtBalls: [...profile.boughtBalls], coinBoost: boost, ...questStates(profile, now),
    balls: { ...profile.balls }, explosions: { ...profile.explosions }, flyers: { ...profile.flyers }, variants: { ...profile.variants },
    daily: publicDaily(profile.daily, now), gemsDay: profile.gemsDay ?? null,
  };
}

/** The balls a guest may fight with (by level, plus any bought early). */
export function guestBalls(profile) {
  return allowedBalls(levelInfo(profile?.wins ?? 0).level, profile?.boughtBalls ?? []);
}

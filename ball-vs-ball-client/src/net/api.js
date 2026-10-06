import { ROUTES, arenaIds, DUEL, nextLimitedOfferEnd, nextWeeklyReset, LIMITED_OFFER, DAILY_QUESTS, nextDailyReset } from '../shared/constants.js';
import { SEED_ARENA_PLAYERS, SEED_LEADERBOARDS, STARTER_PROFILE } from '../shared/lobbySeed.js';
import { levelInfo } from '../shared/levels.js';
import { STARTER_BALLS, buyStoreItem, claimDailyGems, claimDailyReward, fuseItem, grantPurchase, newDailyState, openCrate as openCrateLocally, publicDaily, refreshDaily } from '../shared/rewards.js';
import { getToken } from '../bloxity/sdk.js';

// Talks to the game server (Render). Every call falls back to the shared sample data, so the lobby still looks
// complete when the server is asleep or unreachable.
const TIMEOUT_MS = 6000;
const GUEST_KEY = 'bvb-guest-id';

export function serverUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  // Local development: the server runs on port 2568 of the same machine (also when opened from a phone on the LAN).
  return `${window.location.protocol}//${window.location.hostname}:2568`;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(serverUrl() + path, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status, reason: body?.error });
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {import('../shared/types.js').LobbySnapshot} */
export function offlineLobby(now = Date.now()) {
  return {
    serverTime: now,
    leaderboards: { ...SEED_LEADERBOARDS, weeklyResetsAt: nextWeeklyReset(now) },
    limitedOffer: { id: LIMITED_OFFER.id, name: LIMITED_OFFER.name, endsAt: nextLimitedOfferEnd(now) },
    arenas: arenaIds().map((id) => ({ id, players: SEED_ARENA_PLAYERS[id] ?? 0, capacity: DUEL.playersPerArena, reward: DUEL.winReward })),
    quickJoin: Object.entries(SEED_ARENA_PLAYERS).map(([arenaId, players]) => ({ arenaId, players, reward: DUEL.winReward })),
  };
}

/** @returns {import('../shared/types.js').PublicProfile} */
export function offlineProfile(now = Date.now()) {
  return {
    coins: STARTER_PROFILE.coins,
    gems: STARTER_PROFILE.gems,
    ...levelInfo(0),
    boughtBalls: [],
    coinBoost: STARTER_PROFILE.coinBoost
      ? { multiplier: STARTER_PROFILE.coinBoost.multiplier, endsAt: now + STARTER_PROFILE.coinBoost.durationSec * 1000 }
      : null,
    quests: DAILY_QUESTS.map((quest) => {
      const progress = STARTER_PROFILE.questProgress[quest.id] ?? 0;
      return { ...quest, progress, done: progress >= quest.goal };
    }),
    questsResetAt: nextDailyReset(now),
    balls: { ...STARTER_BALLS },
    explosions: {},
    flyers: {},
    variants: {},
    daily: publicDaily(newDailyState(now), now),
    gemsDay: null,
  };
}

/** Applies a daily claim or a purchase to the client's own copy of the profile (when the server can't be reached). */
function applyOffline(profile, change, now = Date.now()) {
  const next = { ...profile, daily: { ...profile.daily } };
  refreshDaily(next, now);
  const result = change(next, now);
  const error = typeof result === 'string' ? result : result?.error;
  return error ? { error } : { ...(result ?? {}), profile: { ...next, daily: publicDaily(next.daily, now) } };
}

export async function fetchLobby() {
  try {
    return { lobby: await request(ROUTES.lobby), online: true };
  } catch {
    return { lobby: offlineLobby(), online: false };
  }
}

/**
 * Who stands on each arena: { serverTime, arenas: ArenaWatch[] } (see shared/types.js), or null when the server
 * can't be reached.
 */
export async function fetchArenas() {
  try {
    return await request(ROUTES.arenas);
  } catch {
    return null;
  }
}

/**
 * Opens a session (remembering the guest id in this browser); falls back to the starter profile. Signed in to
 * Bloxity, the session plays as that account (the server checks the token with Bloxity): { account: { id, name } }.
 */
let sessionToken = null;

/** This guest's session token (null while offline). */
export const currentSessionToken = () => sessionToken;

export async function openSession() {
  let guestId = null;
  try {
    guestId = localStorage.getItem(GUEST_KEY);
  } catch {
    // Storage blocked (private mode): a new guest each visit.
  }
  try {
    const session = await request(ROUTES.session, { method: 'POST', body: JSON.stringify({ guestId, bloxityToken: getToken() }) });
    try {
      localStorage.setItem(GUEST_KEY, session.guestId);
    } catch {
      // Not remembered; harmless.
    }
    sessionToken = session.sessionToken;
    return { ...session, online: true };
  } catch {
    return { guestId, account: null, sessionToken: null, profile: offlineProfile(), online: false };
  }
}

/** Sends `body` with this guest's session; if the server has dropped the session, opens a new one and retries. */
async function withSession(path, body) {
  if (!sessionToken) await openSession();
  if (!sessionToken) throw new Error('offline');
  const send = () => request(path, { method: 'POST', body: JSON.stringify({ ...body, sessionToken }) });
  try {
    return await send();
  } catch (error) {
    if (error.status !== 401) throw error;
    await openSession();
    return send();
  }
}

/**
 * Stands this guest on an arena spot; `player` ({ name, avatar }) is what the opponent is shown. Resolves to
 * { ok: true, online: true, arena, duel, serverTime }, { ok: false } when another player holds the spot (or a
 * duel is on there), or { ok: true, online: false } when the server can't be reached (the client then plays
 * the duel locally).
 */
export async function joinArena(arenaId, spot, player) {
  try {
    return { ok: true, online: true, ...(await withSession(ROUTES.arenaJoin, { arenaId, spot, ...player })) };
  } catch (error) {
    return error.status === 409 ? { ok: false, online: true } : { ok: true, online: false };
  }
}

/** Takes this guest off their arena spot (forfeiting a duel in progress). Resolves to the arena they left (null when offline). */
export async function leaveArena() {
  try {
    return (await withSession(ROUTES.arenaLeave, {})).arena;
  } catch {
    return null;
  }
}

/**
 * Where this guest stands and how their duel is going: { serverTime, seated, spot, arena, duel, profile }, or
 * null if the server couldn't be reached this time. Poll it while on a spot: it also keeps the spot.
 */
export async function arenaState() {
  try {
    return await withSession(ROUTES.arenaState, {});
  } catch {
    return null;
  }
}

const duelAction = async (route, body) => {
  try {
    return await withSession(route, body);
  } catch (error) {
    return { error: error.status ? 'refused' : 'offline' };
  }
};

/** Duel moves. Each resolves to { serverTime, duel } (reroll adds the profile), or { error }. */
export const duelChoose = (ball) => duelAction(ROUTES.duelChoose, { ball });
export const duelAim = (x, y) => duelAction(ROUTES.duelAim, { x, y });
export const duelReroll = () => duelAction(ROUTES.duelReroll, {});

/**
 * Claims a daily reward or Daily Diamonds, buys a coin-priced store item, or opens a crate. Each resolves to
 * { profile } (opening a crate adds `prizes`) or { error }. Offline, `profile` (the current one) is changed
 * locally by the same rules.
 */
async function shopAction(route, body, profile, change) {
  try {
    return await withSession(route, body);
  } catch (error) {
    if (error.status) return { error: error.reason ?? 'refused' };
    return applyOffline(profile, change);
  }
}
export const claimDaily = (day, profile) => shopAction(ROUTES.dailyClaim, { day }, profile, (next, now) => claimDailyReward(next, day, now));
export const buyItem = (item, profile) => shopAction(ROUTES.storeBuy, { item }, profile, (next) => buyStoreItem(next, item));
export const openCrate = (crate, count, profile) => shopAction(ROUTES.crateOpen, { crate, count }, profile, (next) => openCrateLocally(next, crate, count));
export const claimGems = (profile) => shopAction(ROUTES.dailyGems, {}, profile, (next, now) => claimDailyGems(next, now));
export const fuse = (kind, id, mode, profile) => shopAction(ROUTES.fuse, { kind, id, mode }, profile, (next) => fuseItem(next, kind, id, mode));

/**
 * After Bloxity has taken the Gems for `sku` (transaction `transactionId`): waits for the server to grant it (it
 * hears from Bloxity's webhook) and resolves to { profile } once it has, or { pending: true } if it hasn't yet
 * after a while (it will still arrive). Offline, the product is granted to this copy of `profile`.
 */
export async function confirmPurchase(sku, transactionId, profile) {
  const until = Date.now() + 20_000;
  for (let attempt = 0; Date.now() < until; attempt += 1) {
    let status;
    try {
      status = await withSession(ROUTES.purchaseStatus, { transactionId });
    } catch (error) {
      if (!error.status && attempt === 0) return applyOffline(profile, (next) => grantPurchase(next, sku));
      status = null;
    }
    if (status?.granted) return { profile: status.profile };
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { pending: true };
}

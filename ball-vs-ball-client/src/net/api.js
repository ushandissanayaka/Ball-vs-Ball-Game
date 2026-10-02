import { ROUTES, arenaIds, DUEL, nextLimitedOfferEnd, nextWeeklyReset, LIMITED_OFFER, DAILY_QUESTS, nextDailyReset } from '../shared/constants.js';
import { SEED_ARENA_PLAYERS, SEED_LEADERBOARDS, STARTER_PROFILE } from '../shared/lobbySeed.js';

// Talks to the game server (Render). Every call falls back to the shared sample data, so the lobby still looks
// complete when the server is asleep or unreachable.
const TIMEOUT_MS = 6000;
const GUEST_KEY = 'bvb-guest-id';

function serverUrl() {
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
    level: STARTER_PROFILE.level,
    coinBoost: STARTER_PROFILE.coinBoost
      ? { multiplier: STARTER_PROFILE.coinBoost.multiplier, endsAt: now + STARTER_PROFILE.coinBoost.durationSec * 1000 }
      : null,
    quests: DAILY_QUESTS.map((quest) => {
      const progress = STARTER_PROFILE.questProgress[quest.id] ?? 0;
      return { ...quest, progress, done: progress >= quest.goal };
    }),
    questsResetAt: nextDailyReset(now),
  };
}

export async function fetchLobby() {
  try {
    return { lobby: await request(ROUTES.lobby), online: true };
  } catch {
    return { lobby: offlineLobby(), online: false };
  }
}

/** Opens a guest session (remembering the guest id in this browser); falls back to the starter profile. */
export async function openSession() {
  let guestId = null;
  try {
    guestId = localStorage.getItem(GUEST_KEY);
  } catch {
    // Storage blocked (private mode): a new guest each visit.
  }
  try {
    const session = await request(ROUTES.session, { method: 'POST', body: JSON.stringify({ guestId }) });
    try {
      localStorage.setItem(GUEST_KEY, session.guestId);
    } catch {
      // Not remembered; harmless.
    }
    return { ...session, online: true };
  } catch {
    return { guestId, sessionToken: null, profile: offlineProfile(), online: false };
  }
}

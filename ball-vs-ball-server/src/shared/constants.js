// Game rules and settings that the client and the server must agree on.
// The client and the server each keep a copy of this file: change both together.

export const GAME = { slug: 'ball-vs-ball', name: 'Ball vs Ball' };

/** HTTP routes the server exposes and the client calls. */
export const ROUTES = {
  health: '/health',
  lobby: '/api/lobby',
  arenas: '/api/arenas',
  session: '/api/session',
  arenaJoin: '/api/arena/join',
  arenaLeave: '/api/arena/leave',
  arenaState: '/api/arena/state',
  duelChoose: '/api/duel/choose',
  duelAim: '/api/duel/aim',
  duelReroll: '/api/duel/reroll',
  dailyClaim: '/api/daily/claim',
  storeBuy: '/api/store/buy',
  crateOpen: '/api/crate/open',
  dailyGems: '/api/gems/daily',
  fuse: '/api/fuse',
  purchaseStatus: '/api/purchase/status',
  bloxityWebhook: '/api/bloxity/webhook',
};

/** 1v1 duel arenas along the runway: `arenasPerSide` on the west (W) and east (E) platforms. */
export const DUEL = {
  playersPerArena: 2,
  winReward: 100,
  arenasPerSide: 5,
};

/** Arena ids, north to south: W1..W5, E1..E5. */
export function arenaIds() {
  const ids = [];
  for (const side of ['W', 'E']) {
    for (let row = 1; row <= DUEL.arenasPerSide; row += 1) ids.push(`${side}${row}`);
  }
  return ids;
}

export const DAILY_QUESTS = [
  { id: 'duel_friend', title: 'Duel with a friend', goal: 1, reward: 100 },
  { id: 'win_3', title: 'Win 3 times', goal: 3, reward: 100 },
  { id: 'play_10', title: 'Play 10 times', goal: 10, reward: 100 },
];

/** The limited-time item on the shop stand rotates every `periodHours`. */
export const LIMITED_OFFER = { id: 'chain_ball', name: 'Chain Ball', periodHours: 48 };

export const LEADERBOARD = { size: 7 };

const HOUR = 3600_000;
const DAY = 24 * HOUR;
// 1970-01-05 was a Monday, so weekly cycles counted from it reset on Monday 00:00 UTC.
const MONDAY_ANCHOR = 4 * DAY;

/** End of the current fixed-length cycle. Stateless, so a server restart never moves it. */
export function nextCycleEnd(now, periodMs, anchorMs = 0) {
  return anchorMs + (Math.floor((now - anchorMs) / periodMs) + 1) * periodMs;
}

export const nextDailyReset = (now) => nextCycleEnd(now, DAY);
export const nextWeeklyReset = (now) => nextCycleEnd(now, 7 * DAY, MONDAY_ANCHOR);
export const nextLimitedOfferEnd = (now) => nextCycleEnd(now, LIMITED_OFFER.periodHours * HOUR);
/** "2026-10-02": the UTC day a timestamp falls on (daily quests reset when it changes). */
export const utcDayKey = (now) => new Date(now).toISOString().slice(0, 10);

const pad2 = (n) => String(n).padStart(2, '0');

/** "23:57:25" */
export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

/** "06:30" */
export function formatMinSec(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/** "1d 23h", "5h 12m", "8m" */
export function formatDayHour(ms) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m % 60}m`;
}

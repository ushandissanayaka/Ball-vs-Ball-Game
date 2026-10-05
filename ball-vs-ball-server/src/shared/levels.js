import { BALL_IDS } from './balls.js';

// Levels and which balls a player may fight with. Every 3 duels won completes a level. A player starts with the
// first 8 balls; at level 5, 10, 15... the next 3 unlock (each ball's `unlockLevel` in shared/balls.js), and each
// newer group is stronger: 20 more health than the one before (100, 120, 140...). A locked ball can be bought
// early instead (`boughtBalls` on the profile).
// The client and the server each keep a copy of this file: change both together.

export const WINS_PER_LEVEL = 3;
export const UNLOCK_EVERY = 5; // levels between ball unlocks
export const BALLS_PER_UNLOCK = 3;
export const STARTER_BALL_COUNT = 8;
const BASE_HP = 100;
const HP_STEP = 20;
// What buying a locked ball early costs (bux), by how far off its unlock is.
const PRICES = [0, 149, 249, 399, 549];

/** The unlock order: 8 starters, then groups of 3. */
export const UNLOCK_ORDER = [
  'electric', 'burst', 'cell', 'charge', 'spider', 'vampire', 'thief', 'axe',
  'verity', 'snake', 'virus',
  'hook', 'poison', 'spear',
  'laser',
];

/** Which unlock group a ball is in: 0 for the starters, 1 for those at level 5, 2 at level 10... */
export function tierOf(ball) {
  const i = UNLOCK_ORDER.indexOf(ball);
  if (i < 0) return 0;
  return i < STARTER_BALL_COUNT ? 0 : 1 + Math.floor((i - STARTER_BALL_COUNT) / BALLS_PER_UNLOCK);
}

/** The level a ball unlocks at (0 for the starters). */
export const unlockLevel = (ball) => tierOf(ball) * UNLOCK_EVERY;
/** A ball's starting health: 100 for the starters, 20 more for each later group. */
export const tierHp = (ball) => BASE_HP + tierOf(ball) * HP_STEP;
/** What buying `ball` before it unlocks costs, in bux. */
export const ballPrice = (ball) => PRICES[Math.min(PRICES.length - 1, tierOf(ball))];

/** Levels completed and progress toward the next: { level, wins, into (0..2), toNext }. */
export function levelInfo(wins = 0) {
  const w = Math.max(0, Math.floor(wins));
  return { level: Math.floor(w / WINS_PER_LEVEL), wins: w, into: w % WINS_PER_LEVEL, toNext: WINS_PER_LEVEL - (w % WINS_PER_LEVEL) };
}

/** The balls a player at `level` who bought `bought` may fight with, in unlock order. */
export function allowedBalls(level = 0, bought = []) {
  return BALL_IDS.filter((ball) => unlockLevel(ball) <= level || bought.includes(ball))
    .sort((a, b) => UNLOCK_ORDER.indexOf(a) - UNLOCK_ORDER.indexOf(b));
}

/** The balls that unlock on reaching exactly `level` (empty for most levels). */
export const unlockedAt = (level) => (level > 0 && level % UNLOCK_EVERY === 0 ? UNLOCK_ORDER.filter((ball) => unlockLevel(ball) === level) : []);

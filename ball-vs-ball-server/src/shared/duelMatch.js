import { BALL_IDS, isBall } from './balls.js';
import { mulberry32, resolveFight, SIM } from './duelSim.js';

// One 1v1 duel, from both players standing on their spots to someone running out of hearts. Pure state: the
// time is passed in, nothing runs on its own. The server keeps the real one; offline, the client runs one
// locally against a bot. Phases, in order:
//   intro   the VS board counts down 3..2..1 with both pictures, then the spotlights shoot up
//   choose  each player picks a ball (from three offers, or any ball)
//   aim     each player sets the direction their ball starts in, and locks it
//   fight   a moment to get ready, the balls fight (duelSim), then the winning ball flies out at the loser's
//           head (the loser has lost a heart already; screens show it when the ball lands)
//   ...back to choose while both have hearts, then
//   over    the winner is shown; then `done` (the arena lets both players go)
// Leaving during the intro cancels the match (`canceled`); leaving later, or going silent, forfeits it.
// The client and the server each keep a copy of this file: change both together.

export const DUEL_TIMING = {
  hearts: 3,
  introMs: 4200,
  chooseMs: 10_000,
  aimMs: 20_000,
  goMs: 1600,
  strikeMs: 4400,
  overMs: 5500,
  offers: 3,
  rerollCost: 3,
  dropAfterMs: 15_000,
};

export const SIDES = ['pink', 'blue'];
export const otherSide = (side) => (side === 'pink' ? 'blue' : 'pink');
const msPerTick = 1000 / SIM.tickRate;
const OPEN = new Set(['intro', 'choose', 'aim', 'fight']);

/** `players`: { pink: { id, name, avatar }, blue: { ... } }. */
export function createMatch({ id, seed, now, players }) {
  const match = {
    id, seed: seed >>> 0, round: 0, phase: 'intro', phaseEndsAt: now + DUEL_TIMING.introMs,
    players: {}, fight: null, winner: null, endedBy: null, settled: false,
  };
  for (const side of SIDES) {
    const { id: playerId, name, avatar } = players[side];
    match.players[side] = {
      id: playerId, name, avatar, hearts: DUEL_TIMING.hearts, offers: [], rerolls: 0, ball: null, aim: null, locked: false, lastSeen: now,
    };
  }
  return match;
}

const roundRandom = (match, salt) => mulberry32(match.seed ^ Math.imul(match.round + 1, 0x9e3779b1) ^ salt);

function deal(match, side) {
  const player = match.players[side];
  const rand = roundRandom(match, (side === 'pink' ? 0x1f123bb5 : 0x7a3c9e41) ^ Math.imul(player.rerolls + 1, 0x85ebca6b));
  const pool = [...BALL_IDS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  player.offers = pool.slice(0, DUEL_TIMING.offers);
}

function startRound(match, at) {
  match.round += 1;
  match.fight = null;
  for (const side of SIDES) {
    Object.assign(match.players[side], { ball: null, aim: null, locked: false, rerolls: 0 });
    deal(match, side);
  }
  match.phase = 'choose';
  match.phaseEndsAt = at + DUEL_TIMING.chooseMs;
}

const tidyAim = (x, y) => {
  const length = Math.sqrt(x * x + y * y);
  if (!(length > 1e-6)) return null;
  // Rounded, so the server and the screens start the fight from exactly the same numbers.
  return { x: Math.round((x / length) * 1000) / 1000, y: Math.round((y / length) * 1000) / 1000 };
};

function startFight(match, at) {
  const rand = roundRandom(match, 0x2c1b3c6d);
  for (const side of SIDES) {
    const player = match.players[side];
    // Nobody locked in: straight at the other ball, give or take a little.
    if (!player.aim) player.aim = tidyAim(side === 'pink' ? 1 : -1, (rand() - 0.5) * 0.6);
    player.locked = true;
  }
  const setup = {
    seed: Math.floor(rand() * 2 ** 31),
    pink: { ball: match.players.pink.ball, aim: match.players.pink.aim },
    blue: { ball: match.players.blue.ball, aim: match.players.blue.aim },
  };
  const { winner, ticks } = resolveFight(setup);
  const loser = otherSide(winner);
  const startsAt = at + DUEL_TIMING.goMs;
  const endsAt = startsAt + Math.round(ticks * msPerTick);
  match.players[loser].hearts -= 1;
  match.fight = { setup, startsAt, endsAt, ticks, winner, loser };
  match.phase = 'fight';
  match.phaseEndsAt = endsAt + DUEL_TIMING.strikeMs;
}

function finish(match, winner, endedBy, at) {
  match.winner = winner;
  match.endedBy = endedBy;
  match.phase = 'over';
  match.phaseEndsAt = at + DUEL_TIMING.overMs;
}

/** Moves the match on to where it should be at `now` (any number of phases). */
export function advance(match, now) {
  for (;;) {
    if (OPEN.has(match.phase)) {
      const gone = SIDES.find((side) => now - match.players[side].lastSeen > DUEL_TIMING.dropAfterMs);
      if (gone) {
        forfeit(match, gone, now);
        continue;
      }
    }
    const due = now >= match.phaseEndsAt;
    const at = due ? match.phaseEndsAt : now;
    const { pink, blue } = match.players;
    if (match.phase === 'intro' && due) startRound(match, at);
    else if (match.phase === 'choose' && (due || (pink.ball && blue.ball))) {
      for (const player of [pink, blue]) player.ball ??= player.offers[0];
      match.phase = 'aim';
      match.phaseEndsAt = at + DUEL_TIMING.aimMs;
    } else if (match.phase === 'aim' && (due || (pink.locked && blue.locked))) startFight(match, at);
    else if (match.phase === 'fight' && due) {
      const { winner, loser } = match.fight;
      if (match.players[loser].hearts <= 0) finish(match, winner, 'hearts', at);
      else startRound(match, at);
    } else if (match.phase === 'over' && due) match.phase = 'done';
    else return match;
  }
}

/** The player on `side` was heard from (the server drops players it stops hearing from). */
export function touch(match, side, now) {
  match.players[side].lastSeen = now;
}

/** Picks a ball (any ball: the offers are suggestions). Returns an error message, or null. */
export function chooseBall(match, side, ball) {
  if (match.phase !== 'choose') return 'Not choosing now';
  if (!isBall(ball)) return 'No such ball';
  match.players[side].ball = ball;
  return null;
}

/** Deals `side` three new offers. The caller charges for it. Returns an error message, or null. */
export function reroll(match, side) {
  if (match.phase !== 'choose') return 'Not choosing now';
  if (match.players[side].ball) return 'Ball already chosen';
  match.players[side].rerolls += 1;
  deal(match, side);
  return null;
}

/** Locks `side`'s aim to the direction (x, y), y up. Returns an error message, or null. */
export function lockAim(match, side, x, y) {
  if (match.phase !== 'aim') return 'Not aiming now';
  const player = match.players[side];
  if (player.locked) return 'Aim already locked';
  const aim = Number.isFinite(x) && Number.isFinite(y) ? tidyAim(x, y) : null;
  if (!aim) return 'Bad aim';
  player.aim = aim;
  player.locked = true;
  return null;
}

/** `side` left (or went silent): during the intro that cancels the match, later the other side wins. */
export function forfeit(match, side, now) {
  if (match.phase === 'intro') match.phase = 'canceled';
  else if (OPEN.has(match.phase)) {
    match.fight = null;
    finish(match, otherSide(side), 'forfeit', now);
  }
}

/** What the player on `side` may see: their own offers, the other's ball only once both have chosen. */
export function viewFor(match, side, now) {
  const player = (s) => {
    const p = match.players[s];
    const shown = s === side || match.phase !== 'choose';
    return {
      name: p.name, avatar: p.avatar, hearts: p.hearts, chosen: Boolean(p.ball), locked: p.locked,
      ball: shown ? p.ball : null, ...(s === side ? { offers: p.offers, rerolls: p.rerolls } : {}),
    };
  };
  return {
    id: match.id, phase: match.phase, round: match.round, you: side, serverTime: now, phaseEndsAt: match.phaseEndsAt,
    players: { pink: player('pink'), blue: player('blue') },
    fight: match.phase === 'fight' ? match.fight : null,
    winner: match.winner, endedBy: match.endedBy,
  };
}

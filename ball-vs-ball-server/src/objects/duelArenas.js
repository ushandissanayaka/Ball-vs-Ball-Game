import { randomBytes, randomInt } from 'node:crypto';
import { DUEL, arenaIds } from '../shared/constants.js';
import { SEED_ARENA_PLAYERS } from '../shared/lobbySeed.js';
import { SIDES, advance, createMatch, forfeit, touch, viewFor } from '../shared/duelMatch.js';
import { settleDuel } from '../progress/duelRewards.js';

// The 1v1 arenas along the runway. Each has a pink and a blue spot; the server owns who stands on which, so
// every player sees the same counts. A guest waits on one spot at a time. When both spots are taken a duel
// starts (shared/duelMatch.js); it moves on whenever someone asks about it, so nothing here runs on a timer.
export const SPOTS = SIDES;
// Players on a spot poll about twice a second; one silent this long (tab closed) gives up a spot it waits on.
const SEAT_TIMEOUT_MS = 8000;

const arenas = new Map(arenaIds().map((id) => {
  const seeded = SEED_ARENA_PLAYERS[id] ?? 0;
  const spots = Object.fromEntries(SPOTS.map((spot, i) => [spot, i < seeded ? `seed-${id}-${spot}` : null]));
  return [id, { id, spots, guests: {}, seen: {}, match: null, capacity: DUEL.playersPerArena, reward: DUEL.winReward }];
}));

const filled = (arena) => SPOTS.filter((spot) => arena.spots[spot]).length;
const publicArena = (arena) => ({ id: arena.id, players: filled(arena), capacity: arena.capacity, reward: arena.reward });
// The players' screens send the squares up into the spotlights a second before the countdown ends.
const LAUNCH_BEFORE_MS = 1000;
/**
 * Who stands where, for everyone in the lobby to see: { pink, blue } each { name, avatar } or null, whether
 * their duel is on (`live`), and when (server time) its squares fly up and the box grows (`launchAt`, so the
 * lobby shows it at the same moment as the players). `duel` is the duel as a spectator sees it (phase, hearts,
 * the balls once both have chosen, and the fight's setup, which every screen replays the same way): nothing a
 * player could use against the other (no offers, no ball before both have chosen).
 */
const occupantsOf = (arena, now) => ({
  live: Boolean(arena.match),
  duel: arena.match ? viewFor(arena.match, null, now) : null,
  launchAt: arena.match?.phase === 'intro' ? arena.match.phaseEndsAt - LAUNCH_BEFORE_MS : 0,
  ...Object.fromEntries(SPOTS.map((spot) => {
    const info = arena.guests[arena.spots[spot]];
    return [spot, info ? { name: info.name, avatar: info.avatar } : null];
  })),
});
const sideOf = (match, guestId) => SPOTS.find((side) => match.players[side].id === guestId) ?? null;

function seatOf(guestId) {
  for (const arena of arenas.values()) {
    for (const spot of SPOTS) if (arena.spots[spot] === guestId) return { arena, spot };
  }
  return null;
}

function free(arena, spot) {
  delete arena.guests[arena.spots[spot]];
  delete arena.seen[arena.spots[spot]];
  arena.spots[spot] = null;
}

/** Brings the arena's duel up to `now`: pays out a finished one, lets its players go, starts a new one. */
function refresh(arena, now) {
  // Someone waiting for an opponent who has stopped asking has gone (a duel drops its silent players itself).
  if (!arena.match) {
    for (const spot of SPOTS) {
      const id = arena.spots[spot];
      if (id && arena.seen[id] !== undefined && now - arena.seen[id] > SEAT_TIMEOUT_MS) free(arena, spot);
    }
  }
  const match = arena.match;
  if (match) {
    advance(match, now);
    if ((match.phase === 'over' || match.phase === 'done') && !match.settled) {
      match.settled = true;
      settleDuel(match, now);
    }
    if (match.phase === 'done') {
      for (const spot of SPOTS) if (arena.spots[spot] === match.players[spot].id) free(arena, spot);
      arena.match = null;
    } else if (match.phase === 'canceled') {
      arena.match = null;
    }
  }
  if (!arena.match && arena.spots.pink && arena.spots.blue) {
    const players = Object.fromEntries(SPOTS.map((spot) => {
      const id = arena.spots[spot];
      return [spot, { id, ...(arena.guests[id] ?? { name: 'Player', avatar: null }) }];
    }));
    arena.match = createMatch({ id: randomBytes(6).toString('hex'), seed: randomInt(2 ** 31), now, players });
  }
}

const duelView = (arena, guestId, now) => {
  const side = arena.match && sideOf(arena.match, guestId);
  return side ? viewFor(arena.match, side, now) : null;
};

export function listArenas(now = Date.now()) {
  for (const arena of arenas.values()) refresh(arena, now);
  return [...arenas.values()].map(publicArena);
}

/** Every arena with who stands on it (see `occupantsOf`), for the lobby's frequent check. */
export function watchArenas(now = Date.now()) {
  for (const arena of arenas.values()) refresh(arena, now);
  return [...arenas.values()].map((arena) => ({ ...publicArena(arena), occupants: occupantsOf(arena, now) }));
}

/** Arenas with someone waiting for an opponent. */
export const listQuickJoin = () =>
  [...arenas.values()]
    .filter((arena) => !arena.match && filled(arena) > 0 && filled(arena) < arena.capacity)
    .map((arena) => ({ arenaId: arena.id, players: filled(arena), reward: arena.reward }));

/**
 * Takes the guest off whatever spot they hold (forfeiting a duel they are in). Returns the arena they left, or
 * null.
 */
export function leaveArena(guestId, now = Date.now()) {
  const seat = seatOf(guestId);
  if (!seat) return null;
  const { arena, spot } = seat;
  if (arena.match && sideOf(arena.match, guestId)) {
    forfeit(arena.match, sideOf(arena.match, guestId), now);
  }
  free(arena, spot);
  refresh(arena, now);
  return publicArena(arena);
}

/**
 * Puts the guest on `spot` of `arenaId` (leaving any spot they held); if someone else has that spot, on the
 * other one when it's free. `info` is { name, avatar }, shown to the opponent. Returns { arena, spot, duel } or
 * { error }: unknown arena or spot, both spots are someone else's, or a duel is on there.
 */
export function joinArena(guestId, arenaId, asked, info, now = Date.now()) {
  const arena = arenas.get(arenaId);
  if (!arena || !SPOTS.includes(asked)) return { error: 'No such arena spot' };
  refresh(arena, now);
  const takenByOther = (s) => arena.spots[s] && arena.spots[s] !== guestId;
  const spot = takenByOther(asked) ? SPOTS.find((s) => !takenByOther(s)) : asked;
  if (!spot) return { error: 'That spot is taken' };
  const holder = arena.spots[spot];
  if (arena.match && !sideOf(arena.match, guestId)) return { error: 'A duel is on there' };
  if (holder !== guestId) {
    leaveArena(guestId, now);
    arena.spots[spot] = guestId;
  }
  arena.guests[guestId] = info;
  arena.seen[guestId] = now;
  refresh(arena, now);
  return { arena: publicArena(arena), spot, duel: duelView(arena, guestId, now) };
}

/** Where the guest stands and how their duel is going: { seated, spot, arena, duel }. Also keeps them in it. */
export function arenaState(guestId, now = Date.now()) {
  let seat = seatOf(guestId);
  if (seat) refresh(seat.arena, now);
  seat = seatOf(guestId);
  if (!seat) return { seated: false, spot: null, arena: null, duel: null };
  const { arena, spot } = seat;
  arena.seen[guestId] = now;
  const side = arena.match && sideOf(arena.match, guestId);
  if (side) touch(arena.match, side, now);
  return { seated: true, spot, arena: publicArena(arena), duel: duelView(arena, guestId, now) };
}

/**
 * Runs `act(match, side)` on the guest's duel (brought up to date first). `act` returns an error message or
 * null. Returns { duel } or { error, status }.
 */
export function actInDuel(guestId, now, act) {
  const seat = seatOf(guestId);
  if (seat) refresh(seat.arena, now);
  const match = seat?.arena.match;
  const side = match && sideOf(match, guestId);
  if (!side) return { error: 'Not in a duel', status: 409 };
  touch(match, side, now);
  const error = act(match, side);
  if (error) return { error, status: 409 };
  refresh(seat.arena, now);
  return { duel: duelView(seat.arena, guestId, now) };
}

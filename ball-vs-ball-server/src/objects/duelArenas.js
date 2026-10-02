import { DUEL, arenaIds } from '../shared/constants.js';
import { SEED_ARENA_PLAYERS } from '../shared/lobbySeed.js';

// The 1v1 arenas along the runway. The server owns how many players stand on each; duels will update it.
const arenas = new Map(
  arenaIds().map((id) => [id, { id, players: SEED_ARENA_PLAYERS[id] ?? 0, capacity: DUEL.playersPerArena, reward: DUEL.winReward }]),
);

export const listArenas = () => [...arenas.values()].map((arena) => ({ ...arena }));

/** Arenas with someone waiting for an opponent. */
export const listQuickJoin = () =>
  [...arenas.values()]
    .filter((arena) => arena.players > 0 && arena.players < arena.capacity)
    .map((arena) => ({ arenaId: arena.id, players: arena.players, reward: arena.reward }));

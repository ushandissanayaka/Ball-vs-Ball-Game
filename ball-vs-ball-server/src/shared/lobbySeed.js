// Sample lobby data. The server starts from it, and the client shows it when the server can't be reached,
// so the lobby never looks empty. Replace with real data as purchases, duels and accounts are added.
// The client and the server each keep a copy of this file: change both together.

/** Leaderboard rows: { name, amount } (Bux spent), best first. */
export const SEED_LEADERBOARDS = {
  allTime: [
    { name: 'NovaStriker', amount: 74536 },
    { name: 'BubbleBaron', amount: 42201 },
    { name: 'OrbitQueen', amount: 39294 },
    { name: 'SpikeRoller', amount: 35256 },
    { name: 'BounceLord25', amount: 27018 },
    { name: 'PixelPop', amount: 23490 },
    { name: 'ZoomZoom99', amount: 22240 },
  ],
  weekly: [
    { name: 'NovaStriker', amount: 74536 },
    { name: 'SpikeRoller', amount: 35256 },
    { name: 'BubbleBaron', amount: 27096 },
    { name: 'PixelPop', amount: 23490 },
    { name: 'CometKid', amount: 21123 },
    { name: 'GlowGlider', amount: 14681 },
    { name: 'TinyTitan', amount: 13240 },
  ],
};

/** Players already waiting on an arena (arena id → count). Empty: every arena starts at 0/2. */
export const SEED_ARENA_PLAYERS = {};

/** What a brand-new guest starts with: everything at zero. Saves with an older `version` start over from this. */
export const STARTER_PROFILE = {
  version: 2,
  coins: 0,
  gems: 0,
  level: 0,
  coinBoost: null, // { multiplier, durationSec } to start new guests with a boost
  questProgress: { duel_friend: 0, win_3: 0, play_10: 0 },
};

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

/** Players listed on the Trade tab: { name, level, streak } (streak: win streak shown with a flame, 0 for none). */
export const SEED_TRADE_PLAYERS = [
  { name: 'OP_GAMER123', level: 23, streak: 0 },
  { name: 'PlainNoodle', level: 17, streak: 3 },
  { name: 'Someone2008418', level: 15, streak: 4 },
  { name: 'Ellomate', level: 14, streak: 0 },
  { name: 'Dhruvlovesmamacity', level: 12, streak: 0 },
  { name: 'Cute', level: 11, streak: 4 },
  { name: 'TurkeyHeadB', level: 10, streak: 0 },
  { name: 'Btrot109', level: 7, streak: 1 },
  { name: 'Jadoujaja3', level: 6, streak: 0 },
  { name: 'shandp99', level: 6, streak: 0 },
  { name: 'ducky', level: 5, streak: 0 },
  { name: 'MKrakken67', level: 4, streak: 3 },
];

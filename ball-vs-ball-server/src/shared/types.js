// Shapes of the data the server sends and the client reads (JSDoc only; nothing runs here).
// The client and the server each keep a copy of this file: change both together.

/**
 * @typedef {{ name: string, amount: number }} LeaderboardRow
 *
 * @typedef {{ id: string, players: number, capacity: number, reward: number }} ArenaState
 *
 * @typedef {Object} LobbySnapshot   GET /api/lobby
 * @property {number} serverTime
 * @property {{ allTime: LeaderboardRow[], weekly: LeaderboardRow[], weeklyResetsAt: number }} leaderboards
 * @property {{ id: string, name: string, endsAt: number }} limitedOffer
 * @property {ArenaState[]} arenas
 * @property {{ arenaId: string, players: number, reward: number }[]} quickJoin
 *
 * @typedef {{ id: string, title: string, goal: number, reward: number, progress: number, done: boolean }} QuestState
 *
 * @typedef {Object} PublicProfile   POST /api/session → { guestId, sessionToken, profile }
 * @property {number} coins
 * @property {number} gems
 * @property {number} level
 * @property {{ multiplier: number, endsAt: number } | null} coinBoost
 * @property {QuestState[]} quests
 * @property {number} questsResetAt
 */

export {};

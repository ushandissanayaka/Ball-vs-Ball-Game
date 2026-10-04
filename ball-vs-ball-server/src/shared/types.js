// Shapes of the data the server sends and the client reads (JSDoc only; nothing runs here).
// The client and the server each keep a copy of this file: change both together.

/**
 * @typedef {{ name: string, amount: number }} LeaderboardRow
 *
 * @typedef {{ id: string, players: number, capacity: number, reward: number }} ArenaState
 *
 * @typedef {{ name: string, avatar: { skinUrl?: string, equipped?: { skinId?: string } } }} ArenaOccupant
 * @typedef {ArenaState & { occupants: { live: boolean, launchAt: number, pink: ArenaOccupant | null, blue: ArenaOccupant | null } }} ArenaWatch
 *   GET /api/arenas → { serverTime, arenas: ArenaWatch[] }, asked every couple of seconds
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
 * @property {Record<string, number>} balls   inventory: ball (a key of CATALOG in shared/catalog.js) → how many
 * @property {Record<string, number>} explosions   the same for EXPLOSIONS
 * @property {Record<string, number>} flyers   the same for FLYERS
 * @property {Record<string, { shiny: number, rainbow: number }>} variants   by 'kind:id' (see fuseItem in shared/rewards.js)
 * @property {string | null} gemsDay   UTC day Daily Diamonds were last claimed
 * @property {{ start: string, claimed: number[], lastClaimDay: string | null, unlocked: number, nextUnlockAt: number }} daily
 *                                            the 7-day reward track (see shared/rewards.js)
 *
 * @typedef {Object} DuelPlayer   one side of a duel, as `viewFor` (shared/duelMatch.js) shows it
 * @property {string} name
 * @property {{ skinUrl?: string, equipped: { skinId?: string } }} avatar
 * @property {number} hearts
 * @property {boolean} chosen     picked a ball this round
 * @property {boolean} locked     locked their aim this round
 * @property {string | null} ball  a key of BALLS (shared/balls.js); the opponent's is null until both have chosen
 * @property {string[]} [offers]  only your own: the three balls offered this round
 * @property {number} [rerolls]
 *
 * @typedef {Object} DuelView   POST /api/arena/state → { serverTime, seated, spot, arena, duel, profile }
 * @property {string} id
 * @property {'intro' | 'choose' | 'aim' | 'fight' | 'over' | 'done' | 'canceled'} phase
 * @property {number} round
 * @property {'pink' | 'blue'} you
 * @property {number} serverTime
 * @property {number} phaseEndsAt
 * @property {{ pink: DuelPlayer, blue: DuelPlayer }} players
 * @property {{ setup: { seed: number, pink: { ball: string, aim: { x: number, y: number } }, blue: { ball: string, aim: { x: number, y: number } } },
 *   startsAt: number, endsAt: number, ticks: number, winner: 'pink' | 'blue', loser: 'pink' | 'blue' } | null} fight
 *   only while fighting: run `setup` through shared/duelSim.js to show it
 * @property {'pink' | 'blue' | null} winner
 * @property {'hearts' | 'forfeit' | null} endedBy
 */

export {};

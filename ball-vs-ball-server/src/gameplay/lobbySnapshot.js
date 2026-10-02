import { getLeaderboards } from '../progress/leaderboards.js';
import { getLimitedOffer } from '../objects/limitedOffer.js';
import { listArenas, listQuickJoin } from '../objects/duelArenas.js';

/** @returns {import('../shared/types.js').LobbySnapshot} */
export function getLobbySnapshot(now) {
  return {
    serverTime: now,
    leaderboards: getLeaderboards(now),
    limitedOffer: getLimitedOffer(now),
    arenas: listArenas(),
    quickJoin: listQuickJoin(),
  };
}

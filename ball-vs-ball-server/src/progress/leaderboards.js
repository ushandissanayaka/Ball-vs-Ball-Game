import { LEADERBOARD, nextWeeklyReset } from '../shared/constants.js';
import { SEED_LEADERBOARDS } from '../shared/lobbySeed.js';

// Top Spenders boards. Seed rows until Bux purchases are recorded here.
export function getLeaderboards(now) {
  return {
    allTime: SEED_LEADERBOARDS.allTime.slice(0, LEADERBOARD.size),
    weekly: SEED_LEADERBOARDS.weekly.slice(0, LEADERBOARD.size),
    weeklyResetsAt: nextWeeklyReset(now),
  };
}

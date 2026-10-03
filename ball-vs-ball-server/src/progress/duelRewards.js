import { DUEL } from '../shared/constants.js';
import { SIDES } from '../shared/duelMatch.js';
import { getProfile, setProfile } from './profileStore.js';
import { refreshDailyQuests } from './quests.js';

const bump = (profile, questId) => {
  profile.questProgress[questId] = (profile.questProgress[questId] ?? 0) + 1;
};

/**
 * Pays out a finished duel: both players count a game played, the winner gets the win reward (times any
 * active coin boost) and a win. A duel cancelled before it started pays nothing.
 */
export function settleDuel(match, now) {
  if (!match.winner) return;
  for (const side of SIDES) {
    const profile = getProfile(match.players[side].id);
    if (!profile) continue; // a seeded stand-in, not a real guest
    refreshDailyQuests(profile, now);
    profile.questProgress ??= {};
    bump(profile, 'play_10');
    if (side === match.winner) {
      const boost = profile.coinBoost && profile.coinBoost.endsAt > now ? profile.coinBoost.multiplier : 1;
      profile.coins += DUEL.winReward * boost;
      bump(profile, 'win_3');
    }
    setProfile(match.players[side].id, profile);
  }
}

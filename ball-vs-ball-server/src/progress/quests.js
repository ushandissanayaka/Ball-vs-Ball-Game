import { DAILY_QUESTS, nextDailyReset, utcDayKey } from '../shared/constants.js';

/** Clears quest progress when the UTC day has changed since it was last touched. Returns true if it did. */
export function refreshDailyQuests(profile, now) {
  const today = utcDayKey(now);
  if (profile.questDay === today) return false;
  const firstDay = !profile.questDay;
  profile.questDay = today;
  if (!firstDay) profile.questProgress = {};
  return !firstDay;
}

export function questStates(profile, now) {
  return {
    quests: DAILY_QUESTS.map((quest) => {
      const progress = Math.min(quest.goal, profile.questProgress?.[quest.id] ?? 0);
      return { ...quest, progress, done: progress >= quest.goal };
    }),
    questsResetAt: nextDailyReset(now),
  };
}

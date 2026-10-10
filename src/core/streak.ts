import { addDays, daysBetween } from './clock';
import { FREEZE_EVERY, MAX_FREEZES, type DateStr, type Streak } from './types';

/**
 * Run on rollover. Counts the days missed between lastCompletedDate and today
 * (excluding today). If freezes cover every missed day, one is consumed per day
 * and lastCompletedDate moves to yesterday, so repeated checks on the same day
 * are idempotent. Otherwise the streak resets and the freezes are kept.
 */
export function checkMissedDays(streak: Streak, today: DateStr): Streak {
  if (streak.lastCompletedDate === null) return streak;
  const missed = daysBetween(streak.lastCompletedDate, today) - 1;
  if (missed <= 0) return streak;
  if (streak.current === 0) return streak; // nothing to protect, keep the freezes
  if (streak.freezes >= missed) {
    return { ...streak, freezes: streak.freezes - missed, lastCompletedDate: addDays(today, -1) };
  }
  return { ...streak, current: 0 };
}

/** Run when a session completes (or the app opens with nothing due). Once per day. */
export function markDayCompleted(streak: Streak, today: DateStr): Streak {
  if (streak.lastCompletedDate === today) return streak;
  const current = streak.current + 1;
  const freezes = current % FREEZE_EVERY === 0 ? Math.min(MAX_FREEZES, streak.freezes + 1) : streak.freezes;
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastCompletedDate: today,
    freezes,
  };
}

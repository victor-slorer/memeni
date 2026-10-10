import type { Card, DateStr, Level, ReviewLogEntry } from './types';

export interface DayStats {
  date: DateStr;
  reviews: number; // all answers, retries included
  firstAttempts: number;
  correct: number; // first attempts only
  accuracy: number | null; // correct / firstAttempts, null when no first attempts
}

export interface Stats {
  days: DayStats[]; // ascending by date
  perLevel: Record<Level, number>;
  totalFirstAttempts: number;
  overallAccuracy: number | null;
  overrides: { total: number; up: number; down: number };
}

export function computeStats(cards: readonly Card[], log: readonly ReviewLogEntry[]): Stats {
  const byDay = new Map<DateStr, DayStats>();
  let firstAttempts = 0;
  let correct = 0;
  const overrides = { total: 0, up: 0, down: 0 };

  for (const e of log) {
    const d = byDay.get(e.date) ?? { date: e.date, reviews: 0, firstAttempts: 0, correct: 0, accuracy: null };
    d.reviews++;
    if (!e.isRetry) {
      d.firstAttempts++;
      firstAttempts++;
      if (e.correct) {
        d.correct++;
        correct++;
      }
      if (e.finalLevelAfter !== e.autoLevelAfter) {
        overrides.total++;
        if (e.finalLevelAfter > e.autoLevelAfter) overrides.up++;
        else overrides.down++;
      }
    }
    byDay.set(e.date, d);
  }

  const days = [...byDay.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({ ...d, accuracy: d.firstAttempts ? d.correct / d.firstAttempts : null }));

  const perLevel = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 } as Record<Level, number>;
  for (const c of cards) perLevel[c.level]++;

  return {
    days,
    perLevel,
    totalFirstAttempts: firstAttempts,
    overallAccuracy: firstAttempts ? correct / firstAttempts : null,
    overrides,
  };
}

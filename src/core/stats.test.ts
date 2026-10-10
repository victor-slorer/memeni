import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import { makeCard } from './test-utils';
import type { ReviewLogEntry } from './types';

const entry = (e: Partial<ReviewLogEntry>): ReviewLogEntry => ({
  id: 'x', cardId: 'c', sessionId: 's', timestamp: '', date: '2026-10-10', levelBefore: 1,
  correct: true, autoLevelAfter: 2, finalLevelAfter: 2, isRetry: false, response: [], ...e,
});

describe('computeStats', () => {
  it('computes first-attempt accuracy per day, excluding retries', () => {
    const s = computeStats([], [
      entry({ date: '2026-10-11', correct: false }),
      entry({ date: '2026-10-10', correct: true }),
      entry({ date: '2026-10-10', correct: false, autoLevelAfter: 1, finalLevelAfter: 1 }),
      entry({ date: '2026-10-10', correct: true, isRetry: true }),
    ]);
    expect(s.days).toEqual([
      { date: '2026-10-10', reviews: 3, firstAttempts: 2, correct: 1, accuracy: 0.5 },
      { date: '2026-10-11', reviews: 1, firstAttempts: 1, correct: 0, accuracy: 0 },
    ]);
    expect(s.overallAccuracy).toBeCloseTo(1 / 3);
  });

  it('counts overrides up and down', () => {
    const s = computeStats([], [
      entry({ autoLevelAfter: 1, finalLevelAfter: 4 }),
      entry({ autoLevelAfter: 3, finalLevelAfter: 1 }),
      entry({ autoLevelAfter: 3, finalLevelAfter: 3 }),
    ]);
    expect(s.overrides).toEqual({ total: 2, up: 1, down: 1 });
  });

  it('counts cards per level, limbo included separately', () => {
    const s = computeStats([makeCard({ level: 0 }), makeCard({ level: 0 }), makeCard({ level: 3 }), makeCard({ level: 7 })], []);
    expect(s.perLevel).toEqual({ 0: 2, 1: 0, 2: 0, 3: 1, 4: 0, 5: 0, 6: 0, 7: 1 });
  });
});

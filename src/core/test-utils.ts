import type { Card, Level, Rng } from './types';

/** Deterministic PRNG (mulberry32) for tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let n = 0;
export function makeCard(overrides: Partial<Card> = {}): Card {
  n++;
  return {
    id: `card-${n}`,
    type: 'written',
    question: `Question ${n}`,
    answers: ['answer'],
    distractors: [],
    explanation: '',
    level: 1 as Level,
    dueDate: '2026-10-10',
    lastReviewedDate: null,
    importOrder: n,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

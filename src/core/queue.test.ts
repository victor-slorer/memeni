import { describe, expect, it } from 'vitest';
import { buildQueue, insertRetry, type QueueItem } from './queue';
import { makeCard, seeded } from './test-utils';

const TODAY = '2026-10-10';

describe('buildQueue', () => {
  it('only takes cards in bins 1-7 that are due', () => {
    const cards = [
      makeCard({ id: 'limbo', level: 0, dueDate: null }),
      makeCard({ id: 'future', dueDate: '2026-10-11' }),
      makeCard({ id: 'today', dueDate: TODAY }),
      makeCard({ id: 'grad', level: 7, dueDate: '2026-10-01' }),
    ];
    const q = buildQueue(cards, TODAY, seeded(1));
    expect(q.map((i) => i.cardId).sort()).toEqual(['grad', 'today']);
  });

  it('orders by due date ascending: most overdue first, due today last', () => {
    const cards = [
      ...Array.from({ length: 5 }, (_, i) => makeCard({ id: `t${i}`, dueDate: TODAY })),
      ...Array.from({ length: 5 }, (_, i) => makeCard({ id: `o${i}`, dueDate: '2026-10-08' })),
      ...Array.from({ length: 5 }, (_, i) => makeCard({ id: `y${i}`, dueDate: '2026-10-09' })),
    ];
    const q = buildQueue(cards, TODAY, seeded(7));
    expect(q.map((i) => i.cardId[0]).join('')).toBe('ooooo' + 'yyyyy' + 'ttttt');
    expect(q.every((i) => !i.isRetry)).toBe(true);
  });

  it('shuffles within a due-date group', () => {
    const cards = Array.from({ length: 20 }, (_, i) => makeCard({ id: `c${i}`, dueDate: TODAY }));
    const a = buildQueue(cards, TODAY, seeded(1)).map((i) => i.cardId);
    const b = buildQueue(cards, TODAY, seeded(2)).map((i) => i.cardId);
    expect(a).not.toEqual(b);
    expect([...a].sort()).toEqual([...b].sort());
  });
});

const item = (cardId: string, dueDate: string, isRetry = false): QueueItem => ({ cardId, dueDate, isRetry });

describe('insertRetry', () => {
  it('skips the retry when nothing else is left', () => {
    expect(insertRetry([], 'x', TODAY, seeded(1))).toEqual([]);
  });

  it('goes to the front of the non-overdue block while overdue cards remain', () => {
    const remaining = [item('o1', '2026-10-08'), item('o2', '2026-10-09'), item('t1', TODAY), item('t2', TODAY)];
    const out = insertRetry(remaining, 'x', TODAY, seeded(1));
    expect(out.map((i) => i.cardId)).toEqual(['o1', 'o2', 'x', 't1', 't2']);
    expect(out[2].isRetry).toBe(true);
  });

  it('lands ahead of earlier retries in the non-overdue block', () => {
    const remaining = [item('o1', '2026-10-08'), item('r1', TODAY, true), item('t1', TODAY)];
    const out = insertRetry(remaining, 'x', TODAY, seeded(1));
    expect(out.map((i) => i.cardId)).toEqual(['o1', 'x', 'r1', 't1']);
  });

  it('with nothing overdue, goes to a random position but never first', () => {
    const remaining = [item('t1', TODAY), item('t2', TODAY), item('t3', TODAY)];
    const positions = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      const out = insertRetry(remaining, 'x', TODAY, seeded(seed));
      expect(out).toHaveLength(4);
      positions.add(out.findIndex((i) => i.cardId === 'x'));
    }
    expect([...positions].sort()).toEqual([1, 2, 3]);
  });

  it('with a single card left, goes after it', () => {
    const out = insertRetry([item('t1', TODAY)], 'x', TODAY, seeded(3));
    expect(out.map((i) => i.cardId)).toEqual(['t1', 'x']);
  });
});

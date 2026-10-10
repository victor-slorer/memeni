import { describe, expect, it } from 'vitest';
import { rollover } from './daily';
import { evaluate, commit } from './review';
import { checkMissedDays, markDayCompleted } from './streak';
import { makeCard } from './test-utils';
import { DEFAULT_META, DEFAULT_SETTINGS, type Meta, type Streak } from './types';

const NOW = '2026-10-10T08:00:00.000Z';
const streak = (s: Partial<Streak>): Streak => ({ ...DEFAULT_META.streak, ...s });
const meta = (m: Partial<Meta>): Meta => ({ ...DEFAULT_META, ...m });

describe('rollover: limbo release', () => {
  const limbo = Array.from({ length: 25 }, (_, i) => makeCard({ id: `l${i}`, level: 0, dueDate: null, importOrder: 100 - i }));

  it('releases the next N limbo cards by importOrder into bin 1, due today', () => {
    const r = rollover(limbo, meta({}), DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(r.released).toHaveLength(10);
    expect(r.released.map((c) => c.importOrder)).toEqual([76, 77, 78, 79, 80, 81, 82, 83, 84, 85]);
    expect(r.released.every((c) => c.level === 1 && c.dueDate === '2026-10-10')).toBe(true);
    expect(r.meta.lastReleaseDate).toBe('2026-10-10');
  });

  it('is idempotent on the same day', () => {
    const r = rollover(limbo, meta({ lastReleaseDate: '2026-10-10' }), DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(r.released).toHaveLength(0);
  });

  it('releases once per rollover, not once per skipped day', () => {
    const r = rollover(limbo, meta({ lastReleaseDate: '2026-10-01' }), DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(r.released).toHaveLength(10);
  });

  it('does not use up the day when limbo was empty, so a later import is released the same day', () => {
    const empty = rollover([makeCard({ dueDate: '2026-10-20' })], meta({}), DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(empty.meta.lastReleaseDate).toBeNull();
    const later = rollover(limbo, empty.meta, DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(later.released).toHaveLength(10);
  });

  it('respects newCardsPerDay and an almost empty limbo', () => {
    const r = rollover(limbo.slice(0, 3), meta({}), { ...DEFAULT_SETTINGS, newCardsPerDay: 5 }, '2026-10-10', NOW);
    expect(r.released).toHaveLength(3);
  });
});

describe('rollover: nothing due', () => {
  it('counts the day as completed when the deck has cards but none are due', () => {
    const cards = [makeCard({ dueDate: '2026-10-20' })];
    const r = rollover(cards, meta({ lastReleaseDate: '2026-10-09' }), DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(r.completedWithNothingDue).toBe(true);
    expect(r.meta.streak.current).toBe(1);
    expect(r.meta.streak.lastCompletedDate).toBe('2026-10-10');
  });

  it('does not count when cards are due, when cards were just released, or when the deck is empty', () => {
    expect(rollover([makeCard({ dueDate: '2026-10-10' })], meta({}), DEFAULT_SETTINGS, '2026-10-10', NOW).completedWithNothingDue).toBe(false);
    expect(rollover([makeCard({ level: 0, dueDate: null })], meta({}), DEFAULT_SETTINGS, '2026-10-10', NOW).completedWithNothingDue).toBe(false);
    expect(rollover([], meta({}), DEFAULT_SETTINGS, '2026-10-10', NOW).completedWithNothingDue).toBe(false);
  });

  it('does not count twice on the same day', () => {
    const cards = [makeCard({ dueDate: '2026-10-20' })];
    const first = rollover(cards, meta({}), DEFAULT_SETTINGS, '2026-10-10', NOW);
    const second = rollover(cards, first.meta, DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(second.completedWithNothingDue).toBe(false);
    expect(second.meta.streak.current).toBe(1);
  });
});

describe('streak', () => {
  it('increments once per day and tracks the longest streak', () => {
    let s = markDayCompleted(streak({}), '2026-10-10');
    s = markDayCompleted(s, '2026-10-10');
    expect(s.current).toBe(1);
    s = markDayCompleted(s, '2026-10-11');
    expect(s).toMatchObject({ current: 2, longest: 2, lastCompletedDate: '2026-10-11' });
  });

  it('earns a freeze every 7 days, capped at 2', () => {
    let s = streak({ current: 6, longest: 6, lastCompletedDate: '2026-10-09' });
    s = markDayCompleted(s, '2026-10-10');
    expect(s.freezes).toBe(1);
    s = markDayCompleted(streak({ current: 13, freezes: 1, lastCompletedDate: '2026-10-09' }), '2026-10-10');
    expect(s.freezes).toBe(2);
    s = markDayCompleted(streak({ current: 20, freezes: 2, lastCompletedDate: '2026-10-09' }), '2026-10-10');
    expect(s.freezes).toBe(2);
  });

  it('does nothing when yesterday was completed', () => {
    const s = streak({ current: 5, lastCompletedDate: '2026-10-09', freezes: 1 });
    expect(checkMissedDays(s, '2026-10-10')).toEqual(s);
  });

  it('consumes one freeze per missed day when they cover the whole gap', () => {
    const s = checkMissedDays(streak({ current: 9, lastCompletedDate: '2026-10-07', freezes: 2 }), '2026-10-10');
    expect(s).toMatchObject({ current: 9, freezes: 0, lastCompletedDate: '2026-10-09' });
    // idempotent on a second open the same day
    expect(checkMissedDays(s, '2026-10-10')).toEqual(s);
  });

  it('resets the streak and keeps the freezes when they cannot cover the gap', () => {
    const s = checkMissedDays(streak({ current: 9, lastCompletedDate: '2026-10-07', freezes: 1 }), '2026-10-10');
    expect(s).toMatchObject({ current: 0, freezes: 1 });
  });

  it('does not spend freezes on a streak that is already 0', () => {
    const s = checkMissedDays(streak({ current: 0, lastCompletedDate: '2026-10-08', freezes: 2 }), '2026-10-10');
    expect(s.freezes).toBe(2);
  });

  it('is applied by rollover', () => {
    const r = rollover([makeCard({ dueDate: '2026-10-10' })], meta({ lastReleaseDate: '2026-10-08', streak: streak({ current: 3, lastCompletedDate: '2026-10-08', freezes: 1 }) }), DEFAULT_SETTINGS, '2026-10-10', NOW);
    expect(r.meta.streak).toMatchObject({ current: 3, freezes: 0, lastCompletedDate: '2026-10-09' });
  });
});

describe('review evaluate + commit', () => {
  const ids = { logId: 'log', sessionId: 's' };

  it('moves a correct card up and schedules it', () => {
    const card = makeCard({ level: 2, answers: ['heap'] });
    const p = evaluate(card, ['Heap'], false, DEFAULT_SETTINGS);
    expect(p).toMatchObject({ correct: true, autoLevel: 3 });
    const { card: out, log } = commit(p, p.autoLevel, '2026-10-10', NOW, ids, DEFAULT_SETTINGS);
    expect(out).toMatchObject({ level: 3, dueDate: '2026-10-14', lastReviewedDate: '2026-10-10' });
    expect(log).toMatchObject({ levelBefore: 2, autoLevelAfter: 3, finalLevelAfter: 3, correct: true, isRetry: false, response: ['Heap'] });
  });

  it('logs both the automatic and the overridden level', () => {
    const card = makeCard({ level: 4, answers: ['heap'] });
    const p = evaluate(card, ['heep'], false, DEFAULT_SETTINGS);
    expect(p.autoLevel).toBe(1);
    const { card: out, log } = commit(p, 5, '2026-10-10', NOW, ids, DEFAULT_SETTINGS);
    expect(out.level).toBe(5);
    expect(log).toMatchObject({ autoLevelAfter: 1, finalLevelAfter: 5 });
  });

  it('rejects an override above level + 1', () => {
    const p = evaluate(makeCard({ level: 2 }), ['answer'], false, DEFAULT_SETTINGS);
    expect(() => commit(p, 4, '2026-10-10', NOW, ids, DEFAULT_SETTINGS)).toThrow();
  });

  it('never changes level or due date on a retry', () => {
    const card = makeCard({ level: 1, dueDate: '2026-10-11' });
    const p = evaluate(card, ['answer'], true, DEFAULT_SETTINGS);
    const { card: out, log } = commit(p, 2, '2026-10-10', NOW, ids, DEFAULT_SETTINGS);
    expect(out).toEqual(card);
    expect(log).toMatchObject({ isRetry: true, autoLevelAfter: 1, finalLevelAfter: 1 });
  });

  it('graduates out of bin 6 and resurfaces after 64 days', () => {
    const p = evaluate(makeCard({ level: 6 }), ['answer'], false, DEFAULT_SETTINGS);
    const { card } = commit(p, p.autoLevel, '2026-10-10', NOW, ids, DEFAULT_SETTINGS);
    expect(card).toMatchObject({ level: 7, dueDate: '2026-12-13' });
  });
});

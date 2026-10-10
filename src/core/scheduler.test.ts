import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isDateStr, localDateStr, today } from './clock';
import { allowedOverrides, autoLevel, dueDateFor, restartSchedule } from './scheduler';
import { DEFAULT_SETTINGS, type Level } from './types';

const reset = { mode: 'reset' } as const;
const drop = (bins: number) => ({ mode: 'drop', bins }) as const;

describe('autoLevel', () => {
  it('moves up one bin on a correct answer', () => {
    expect(autoLevel(1, true, reset)).toBe(2);
    expect(autoLevel(5, true, reset)).toBe(6);
  });
  it('graduates a card leaving bin 6, and keeps graduated cards graduated', () => {
    expect(autoLevel(6, true, reset)).toBe(7);
    expect(autoLevel(7, true, reset)).toBe(7);
  });
  it('resets to bin 1 on a miss in reset mode', () => {
    expect(autoLevel(4, false, reset)).toBe(1);
    expect(autoLevel(7, false, reset)).toBe(1);
  });
  it('drops N bins with a floor of 1, graduated counting as level 7', () => {
    expect(autoLevel(5, false, drop(2))).toBe(3);
    expect(autoLevel(2, false, drop(2))).toBe(1);
    expect(autoLevel(1, false, drop(1))).toBe(1);
    expect(autoLevel(7, false, drop(1))).toBe(6);
    expect(autoLevel(7, false, drop(2))).toBe(5);
  });
});

describe('allowedOverrides', () => {
  it('allows 1 .. level + 1', () => {
    expect(allowedOverrides(1)).toEqual([1, 2]);
    expect(allowedOverrides(3)).toEqual([1, 2, 3, 4]);
  });
  it('caps at graduated', () => {
    expect(allowedOverrides(6)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(allowedOverrides(7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('dueDateFor', () => {
  it('uses the exponential intervals and 64 days when graduated', () => {
    const expected: Record<number, string> = { 1: '2026-10-11', 2: '2026-10-12', 3: '2026-10-14', 4: '2026-10-18', 5: '2026-10-26', 6: '2026-11-11', 7: '2026-12-13' };
    for (const [level, date] of Object.entries(expected)) {
      expect(dueDateFor('2026-10-10', Number(level) as Level, DEFAULT_SETTINGS)).toBe(date);
    }
  });
  it('crosses month and year boundaries', () => {
    expect(dueDateFor('2026-12-31', 1, DEFAULT_SETTINGS)).toBe('2027-01-01');
    expect(dueDateFor('2028-02-28', 1, DEFAULT_SETTINGS)).toBe('2028-02-29');
    expect(dueDateFor('2026-12-20', 6, DEFAULT_SETTINGS)).toBe('2027-01-21');
  });
});

describe('restartSchedule', () => {
  it('reschedules bins 1-7 from today and leaves limbo alone', () => {
    const cards = [
      { id: 'a', level: 0 as Level, dueDate: null, updatedAt: 'x' },
      { id: 'b', level: 1 as Level, dueDate: '2026-01-01', updatedAt: 'x' },
      { id: 'c', level: 7 as Level, dueDate: '2026-01-01', updatedAt: 'x' },
    ];
    const out = restartSchedule(cards, '2026-10-10', 'now', DEFAULT_SETTINGS);
    expect(out.map((c) => [c.id, c.dueDate, c.level])).toEqual([
      ['b', '2026-10-11', 1],
      ['c', '2026-12-13', 7],
    ]);
  });
});

describe('clock', () => {
  it('honours the debug override', () => {
    expect(today('2030-01-01', new Date(2026, 9, 10))).toBe('2030-01-01');
    expect(today(null, new Date(2026, 9, 10, 23, 59))).toBe('2026-10-10');
  });
  it('is immune to DST transitions', () => {
    // Europe DST ends 2026-10-25, US 2026-11-01; date math must not care.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysBetween('2026-10-01', '2026-11-30')).toBe(60);
    expect(daysBetween('2026-10-10', '2026-10-09')).toBe(-1);
  });
  it('formats local dates and validates date strings', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isDateStr('2026-02-29')).toBe(false);
    expect(isDateStr('2028-02-29')).toBe(true);
    expect(isDateStr('2026-1-01')).toBe(false);
  });
});

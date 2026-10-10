import { addDays } from './clock';
import { GRADUATED, type DateStr, type Level, type Penalty, type Settings } from './types';

function clampLevel(n: number): Level {
  return Math.max(1, Math.min(GRADUATED, n)) as Level;
}

/** Destination after the first answer. Graduated counts as level 7. */
export function autoLevel(level: Level, correct: boolean, penalty: Penalty): Level {
  if (correct) return clampLevel(level + 1);
  if (penalty.mode === 'reset') return 1;
  return clampLevel(level - penalty.bins);
}

/** Override targets: 1 .. min(level + 1, 7), for correct and wrong answers alike. */
export function allowedOverrides(level: Level): Level[] {
  const max = Math.min(level + 1, GRADUATED);
  return Array.from({ length: max }, (_, i) => (i + 1) as Level);
}

export function intervalFor(level: Level, settings: Settings): number {
  if (level < 1) throw new Error('Limbo cards have no interval');
  if (level === GRADUATED) return settings.graduatedInterval;
  return settings.intervals[level - 1];
}

export function dueDateFor(reviewDate: DateStr, level: Level, settings: Settings): DateStr {
  return addDays(reviewDate, intervalFor(level, settings));
}

/** "Reset dates": every card in bins 1-7 is rescheduled as if reviewed today. Levels kept, limbo untouched. */
export function restartSchedule<C extends { level: Level; dueDate: DateStr | null; updatedAt: string }>(
  cards: readonly C[],
  today: DateStr,
  nowIso: string,
  settings: Settings,
): C[] {
  return cards
    .filter((c) => c.level >= 1)
    .map((c) => ({ ...c, dueDate: dueDateFor(today, c.level, settings), updatedAt: nowIso }));
}

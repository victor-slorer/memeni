import { isDue } from './queue';
import { checkMissedDays, markDayCompleted } from './streak';
import { LIMBO, type Card, type DateStr, type Meta, type Settings } from './types';

export interface RolloverResult {
  released: Card[]; // cards moved from limbo to bin 1 (to persist)
  meta: Meta;
  /** True when this rollover marked today completed because nothing was due. */
  completedWithNothingDue: boolean;
}

/** Limbo cards in release order. */
export function limboInOrder(cards: readonly Card[]): Card[] {
  return cards.filter((c) => c.level === LIMBO).sort((a, b) => a.importOrder - b.importOrder);
}

/**
 * Runs whenever the app opens (or regains focus). Pure: returns what changed.
 * 1. Release limbo cards until newCardsPerDay have been released today. Skipped days
 *    don't accumulate; raising the setting or importing later in the day tops up.
 * 2. Streak check for missed days.
 * 3. If the deck has cards but none are due, today counts as completed.
 */
export function rollover(cards: readonly Card[], meta: Meta, settings: Settings, today: DateStr, nowIso: string): RolloverResult {
  let released: Card[] = [];
  let nextMeta = meta;

  if (meta.lastReleaseDate === null || meta.lastReleaseDate <= today) {
    const already = meta.lastReleaseDate === today ? meta.releasedOnLastReleaseDate : 0;
    released = limboInOrder(cards)
      .slice(0, Math.max(0, settings.newCardsPerDay - already))
      .map((c) => ({ ...c, level: 1 as const, dueDate: today, updatedAt: nowIso }));
    if (released.length > 0) {
      nextMeta = { ...nextMeta, lastReleaseDate: today, releasedOnLastReleaseDate: already + released.length };
    }
  }

  nextMeta = { ...nextMeta, streak: checkMissedDays(nextMeta.streak, today) };

  let completedWithNothingDue = false;
  const releasedIds = new Set(released.map((c) => c.id));
  const anyDue = released.length > 0 || cards.some((c) => !releasedIds.has(c.id) && isDue(c, today));
  if (cards.length > 0 && !anyDue && nextMeta.streak.lastCompletedDate !== today) {
    nextMeta = { ...nextMeta, streak: markDayCompleted(nextMeta.streak, today) };
    completedWithNothingDue = true;
  }

  return { released, meta: nextMeta, completedWithNothingDue };
}

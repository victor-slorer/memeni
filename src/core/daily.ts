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
 * 1. Release the next newCardsPerDay limbo cards once per rollover (not per skipped day).
 * 2. Streak check for missed days.
 * 3. If the deck has cards but none are due, today counts as completed.
 */
export function rollover(cards: readonly Card[], meta: Meta, settings: Settings, today: DateStr, nowIso: string): RolloverResult {
  let released: Card[] = [];
  let nextMeta = meta;

  if (meta.lastReleaseDate === null || meta.lastReleaseDate < today) {
    released = limboInOrder(cards)
      .slice(0, settings.newCardsPerDay)
      .map((c) => ({ ...c, level: 1 as const, dueDate: today, updatedAt: nowIso }));
    // Only an actual release uses up today's slot, so cards imported later on a
    // day that started with an empty limbo are released straight away.
    if (released.length > 0) nextMeta = { ...nextMeta, lastReleaseDate: today };
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

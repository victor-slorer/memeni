import type { Card, DateStr, Rng } from './types';

export interface QueueItem {
  cardId: string;
  dueDate: DateStr; // snapshot at queue build, used to tell overdue from due-today
  isRetry: boolean;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function isDue(card: Card, today: DateStr): boolean {
  return card.level >= 1 && card.dueDate !== null && card.dueDate <= today;
}

/** Due cards grouped by due date ascending (most overdue first), shuffled within each group. */
export function buildQueue(cards: readonly Card[], today: DateStr, rng: Rng): QueueItem[] {
  const groups = new Map<DateStr, Card[]>();
  for (const c of cards) {
    if (!isDue(c, today)) continue;
    const g = groups.get(c.dueDate!) ?? [];
    g.push(c);
    groups.set(c.dueDate!, g);
  }
  const dates = [...groups.keys()].sort();
  return dates.flatMap((d) =>
    shuffle(groups.get(d)!, rng).map((c) => ({ cardId: c.id, dueDate: d, isRetry: false })),
  );
}

/**
 * Re-insert a missed card once into the remaining queue (the items after the current one).
 * - Nothing else left: skip the retry (returns `remaining` unchanged).
 * - Overdue cards remain: insert at the front of the non-overdue block.
 * - Otherwise: a random position among the remaining cards, never first, so the
 *   answer that was just shown isn't echoed straight back.
 */
export function insertRetry(remaining: readonly QueueItem[], cardId: string, today: DateStr, rng: Rng): QueueItem[] {
  if (remaining.length === 0) return [...remaining];
  const retry: QueueItem = { cardId, dueDate: today, isRetry: true };
  let lastOverdue = -1;
  remaining.forEach((item, i) => {
    if (!item.isRetry && item.dueDate < today) lastOverdue = i;
  });
  const index = lastOverdue >= 0 ? lastOverdue + 1 : 1 + Math.floor(rng() * remaining.length);
  return [...remaining.slice(0, index), retry, ...remaining.slice(index)];
}

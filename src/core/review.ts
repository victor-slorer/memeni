import { gradeCard } from './grading';
import { allowedOverrides, autoLevel, dueDateFor } from './scheduler';
import type { Card, DateStr, Level, ReviewLogEntry, Settings } from './types';

export interface PendingReview {
  card: Card;
  response: string[];
  correct: boolean;
  isRetry: boolean;
  autoLevel: Level; // equals card.level for retries
}

/** Grade an answer and decide the default destination. Nothing is persisted yet. */
export function evaluate(card: Card, response: string[], isRetry: boolean, settings: Settings): PendingReview {
  const correct = gradeCard(card, response, settings.stripLeadingArticles);
  return {
    card,
    response,
    correct,
    isRetry,
    autoLevel: isRetry ? card.level : autoLevel(card.level, correct, settings.penalty),
  };
}

/** Apply the (possibly overridden) result: the updated card and its log entry. */
export function commit(
  pending: PendingReview,
  finalLevel: Level,
  today: DateStr,
  nowIso: string,
  ids: { logId: string; sessionId: string },
  settings: Settings,
): { card: Card; log: ReviewLogEntry } {
  const { card, isRetry } = pending;
  if (isRetry) finalLevel = card.level;
  else if (!allowedOverrides(card.level).includes(finalLevel)) {
    throw new Error(`Level ${finalLevel} is not an allowed destination from level ${card.level}`);
  }
  const updated: Card = isRetry
    ? card
    : { ...card, level: finalLevel, dueDate: dueDateFor(today, finalLevel, settings), lastReviewedDate: today, updatedAt: nowIso };
  return {
    card: updated,
    log: {
      id: ids.logId,
      cardId: card.id,
      sessionId: ids.sessionId,
      timestamp: nowIso,
      date: today,
      levelBefore: card.level,
      correct: pending.correct,
      autoLevelAfter: pending.autoLevel,
      finalLevelAfter: finalLevel,
      isRetry,
      response: pending.response,
    },
  };
}

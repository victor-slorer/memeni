export type CardType = 'written' | 'truefalse' | 'multiple';
export const CARD_TYPES: readonly CardType[] = ['written', 'truefalse', 'multiple'];

// 0 = limbo, 1-6 = bins, 7 = graduated
export type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const LIMBO: Level = 0;
export const GRADUATED: Level = 7;

export type DateStr = string; // local calendar date, 'YYYY-MM-DD'

export interface Card {
  id: string; // UUID
  type: CardType;
  question: string; // plain text, may contain a fenced code block
  answers: string[]; // written: accepted answers, [0] is displayed
  // truefalse: ['true'] or ['false']
  // multiple: the correct options
  distractors: string[]; // multiple only: the wrong options
  explanation: string; // one line shown after answering; '' when absent
  level: Level;
  dueDate: DateStr | null; // null while in limbo
  lastReviewedDate: DateStr | null;
  importOrder: number; // release order from limbo
  createdAt: string; // ISO timestamps
  updatedAt: string;
}

export interface ReviewLogEntry {
  id: string;
  cardId: string;
  sessionId: string;
  timestamp: string;
  date: DateStr;
  levelBefore: Level;
  correct: boolean;
  autoLevelAfter: Level; // what the rules decided
  finalLevelAfter: Level; // after the override
  isRetry: boolean; // retries are logged, never change the bin
  response: string[]; // what was typed or selected
}

export interface SessionRecord {
  id: string;
  date: DateStr;
  start: string; // ISO
  end: string | null; // ISO, null while running
  completed: boolean;
  cardsAnswered: number;
}

export type Penalty = { mode: 'reset' } | { mode: 'drop'; bins: number };

export interface Settings {
  sessionMinutes: number;
  newCardsPerDay: number;
  intervals: number[]; // days for levels 1-6
  graduatedInterval: number; // days for level 7
  penalty: Penalty;
  stripLeadingArticles: boolean;
  pauseTimerOnResult: boolean; // stop the session timer while the answer screen is shown
}

export interface Streak {
  current: number;
  longest: number;
  lastCompletedDate: DateStr | null;
  freezes: number;
}

export interface Meta {
  lastReleaseDate: DateStr | null;
  releasedOnLastReleaseDate: number; // cards released that day, so later rollovers can top up to newCardsPerDay
  streak: Streak;
  debugTodayOverride: DateStr | null;
  schemaVersion: number;
}

export const DB_SCHEMA_VERSION = 1;
export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export const DEFAULT_SETTINGS: Settings = {
  sessionMinutes: 15,
  newCardsPerDay: 10,
  intervals: [1, 2, 4, 8, 16, 32],
  graduatedInterval: 64,
  penalty: { mode: 'reset' },
  stripLeadingArticles: true,
  pauseTimerOnResult: false,
};

export const DEFAULT_META: Meta = {
  lastReleaseDate: null,
  releasedOnLastReleaseDate: 0,
  streak: { current: 0, longest: 0, lastCompletedDate: null, freezes: 0 },
  debugTodayOverride: null,
  schemaVersion: DB_SCHEMA_VERSION,
};

/** Returns a number in [0, 1). Injected everywhere randomness is used so tests are deterministic. */
export type Rng = () => number;

export function levelLabel(level: Level): string {
  if (level === LIMBO) return 'Limbo';
  if (level === GRADUATED) return 'Graduated';
  return `Bin ${level}`;
}

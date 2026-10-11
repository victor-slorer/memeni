import type { CardType } from '../types';

/** One card as read from a file, before validation. */
export interface ParsedCard {
  type: string;
  question: string;
  answers: string[];
  distractors: string[];
  explanation: string; // free text, never split on "|"; '' when absent
  location: string; // e.g. "Line 12"
}

export interface ImportIssue {
  location: string;
  message: string;
}

export interface ParseResult {
  cards: ParsedCard[];
  errors: ImportIssue[];
}

export interface ValidCard {
  type: CardType;
  question: string;
  answers: string[];
  distractors: string[];
  explanation: string;
  location: string;
  duplicateOfExisting: boolean;
}

export interface ValidationResult {
  cards: ValidCard[];
  errors: ImportIssue[]; // any error blocks the whole import
  warnings: ImportIssue[]; // duplicates of existing cards
}

export const SUPPORTED_SCHEMA = 1;

/** Split a `|`-separated field. `\|` is a literal pipe. Items are trimmed; an empty field gives []. */
export function splitPipes(field: string): string[] {
  if (field.trim() === '') return [];
  const items: string[] = [];
  let cur = '';
  for (let i = 0; i < field.length; i++) {
    const ch = field[i];
    if (ch === '\\' && field[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (ch === '|') {
      items.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  items.push(cur.trim());
  return items;
}

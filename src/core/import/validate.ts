import { normalizeQuestion } from '../normalize';
import { CARD_TYPES, type CardType } from '../types';
import type { ImportIssue, ParsedCard, ValidationResult } from './types';

const ALL_NONE = /^(all|none) of the above$/;

/** Validation errors for a single card; empty when the card is fine. Shared with the card editor. */
export function validateCardFields(c: Pick<ParsedCard, 'type' | 'question' | 'answers' | 'distractors' | 'explanation'>): string[] {
  const errs: string[] = [];
  if (!CARD_TYPES.includes(c.type as CardType)) {
    errs.push(`Unknown card type "${c.type}". Use written, truefalse or multiple.`);
    return errs;
  }
  if (c.question.trim() === '') errs.push('Question is empty.');
  if (/[\r\n]/.test(c.explanation)) errs.push('Explanation must be a single line.');
  if (c.answers.some((a) => a.trim() === '') || c.distractors.some((d) => d.trim() === '')) {
    errs.push('Empty item between "|" separators.');
  }

  switch (c.type as CardType) {
    case 'written':
      if (c.answers.length === 0) errs.push('Written cards need at least one answer.');
      if (c.distractors.length > 0) errs.push('Distractors are only for multiple-choice cards.');
      break;
    case 'truefalse':
      if (c.answers.length !== 1 || !['true', 'false'].includes(c.answers[0].toLowerCase())) {
        errs.push('True/false answer must be exactly "true" or "false".');
      }
      if (c.distractors.length > 0) errs.push('Distractors are only for multiple-choice cards.');
      break;
    case 'multiple': {
      const options = [...c.answers, ...c.distractors];
      if (c.answers.length < 1) errs.push('Multiple-choice cards need at least one correct option.');
      if (options.length < 2) errs.push('Multiple-choice cards need at least two options in total.');
      const seen = new Set<string>();
      for (const o of options) {
        const key = normalizeQuestion(o);
        if (seen.has(key)) errs.push(`Option "${o}" appears more than once.`);
        seen.add(key);
        if (ALL_NONE.test(key)) errs.push(`"${o}" is not allowed (no all/none of the above).`);
      }
      break;
    }
  }
  return errs;
}

/**
 * Validates a whole parsed file. Errors block the import; duplicates of
 * existing cards are only warnings (the preview offers to skip them).
 */
export function validateImport(parsed: readonly ParsedCard[], existingQuestions: ReadonlySet<string>): ValidationResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const firstSeen = new Map<string, string>();
  const cards: ValidationResult['cards'] = [];

  for (const p of parsed) {
    const errs = validateCardFields(p);
    for (const message of errs) errors.push({ location: p.location, message });

    const key = normalizeQuestion(p.question);
    const prior = firstSeen.get(key);
    if (prior) errors.push({ location: p.location, message: `Duplicate question (same as ${prior}).` });
    else firstSeen.set(key, p.location);

    const duplicateOfExisting = existingQuestions.has(key);
    if (duplicateOfExisting) warnings.push({ location: p.location, message: 'A card with this question already exists.' });

    if (errs.length === 0) {
      cards.push({
        type: p.type as CardType,
        question: p.question,
        answers: p.type === 'truefalse' ? [p.answers[0].toLowerCase()] : p.answers,
        distractors: p.distractors,
        explanation: p.explanation,
        location: p.location,
        duplicateOfExisting,
      });
    }
  }
  return { cards, errors, warnings };
}

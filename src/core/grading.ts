import { normalizeAnswer } from './normalize';
import type { Card } from './types';

export function gradeWritten(accepted: string[], response: string, stripLeadingArticles: boolean): boolean {
  const given = normalizeAnswer(response, stripLeadingArticles);
  if (given === '') return false;
  return accepted.some((a) => normalizeAnswer(a, stripLeadingArticles) === given);
}

export function gradeTrueFalse(answer: string, response: string): boolean {
  return answer.toLowerCase() === response.toLowerCase();
}

/** All-or-nothing: the selected set must equal the correct set exactly. */
export function gradeMultiple(correct: string[], selected: string[]): boolean {
  const want = new Set(correct);
  const got = new Set(selected);
  if (want.size !== got.size) return false;
  for (const s of got) if (!want.has(s)) return false;
  return true;
}

export function gradeCard(card: Card, response: string[], stripLeadingArticles: boolean): boolean {
  switch (card.type) {
    case 'written':
      return gradeWritten(card.answers, response[0] ?? '', stripLeadingArticles);
    case 'truefalse':
      return gradeTrueFalse(card.answers[0], response[0] ?? '');
    case 'multiple':
      return gradeMultiple(card.answers, response);
  }
}

export interface MultipleBreakdown {
  selectedCorrect: string[];
  missed: string[];
  wronglySelected: string[];
}

export function multipleBreakdown(correct: string[], selected: string[]): MultipleBreakdown {
  const sel = new Set(selected);
  const cor = new Set(correct);
  return {
    selectedCorrect: correct.filter((c) => sel.has(c)),
    missed: correct.filter((c) => !sel.has(c)),
    wronglySelected: selected.filter((s) => !cor.has(s)),
  };
}

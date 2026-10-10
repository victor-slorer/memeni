import { describe, expect, it } from 'vitest';
import { gradeMultiple, gradeTrueFalse, gradeWritten, multipleBreakdown } from './grading';
import { normalizeAnswer } from './normalize';

describe('normalizeAnswer', () => {
  it('trims, lowercases and collapses whitespace', () => {
    expect(normalizeAnswer('  Hash   Table \n', false)).toBe('hash table');
  });
  it('strips diacritics', () => {
    expect(normalizeAnswer('Erdős', false)).toBe('erdos');
    expect(normalizeAnswer('naïve café', false)).toBe('naive cafe');
  });
  it('drops a leading article only when enabled', () => {
    expect(normalizeAnswer('The Stack', true)).toBe('stack');
    expect(normalizeAnswer('an array', true)).toBe('array');
    expect(normalizeAnswer('The Stack', false)).toBe('the stack');
    expect(normalizeAnswer('theorem', true)).toBe('theorem');
  });
});

describe('gradeWritten', () => {
  const accepted = ['O(log n)', 'log n', 'logn'];
  it('accepts any listed answer after normalisation', () => {
    expect(gradeWritten(accepted, 'o(LOG  n)', true)).toBe(true);
    expect(gradeWritten(accepted, 'logn', true)).toBe(true);
  });
  it('rejects anything else, including empty input', () => {
    expect(gradeWritten(accepted, 'O(n)', true)).toBe(false);
    expect(gradeWritten(accepted, '   ', true)).toBe(false);
  });
  it('lists spelling variants explicitly rather than guessing', () => {
    expect(gradeWritten(['colour'], 'color', true)).toBe(false);
    expect(gradeWritten(['colour', 'color'], 'color', true)).toBe(true);
  });
  it('applies the article rule to both sides', () => {
    expect(gradeWritten(['a recursive function'], 'recursive function', true)).toBe(true);
    expect(gradeWritten(['a recursive function'], 'recursive function', false)).toBe(false);
  });
});

describe('gradeTrueFalse', () => {
  it('compares the chosen button', () => {
    expect(gradeTrueFalse('false', 'false')).toBe(true);
    expect(gradeTrueFalse('false', 'true')).toBe(false);
  });
});

describe('gradeMultiple', () => {
  it('requires the exact set, regardless of order', () => {
    expect(gradeMultiple(['A', 'B'], ['B', 'A'])).toBe(true);
    expect(gradeMultiple(['A', 'B'], ['A'])).toBe(false);
    expect(gradeMultiple(['A', 'B'], ['A', 'B', 'C'])).toBe(false);
    expect(gradeMultiple(['A'], [])).toBe(false);
  });
  it('breaks down the result for the result view', () => {
    expect(multipleBreakdown(['A', 'B'], ['B', 'C'])).toEqual({ selectedCorrect: ['B'], missed: ['A'], wronglySelected: ['C'] });
  });
});

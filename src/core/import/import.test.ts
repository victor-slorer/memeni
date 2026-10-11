import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradeWritten } from '../grading';
import { parseCsv } from './csv';
import { parseMarkdown } from './markdown';
import { EXAMPLE_CSV, EXAMPLE_MD } from './schema';
import { splitPipes } from './types';
import { validateImport } from './validate';

const sample = (name: string) => readFileSync(new URL(`../../../samples/${name}`, import.meta.url), 'utf8');

describe('splitPipes', () => {
  it('splits, trims and unescapes', () => {
    expect(splitPipes('a | b|c')).toEqual(['a', 'b', 'c']);
    expect(splitPipes('x \\| y|z')).toEqual(['x | y', 'z']);
    expect(splitPipes('\\|\\||or')).toEqual(['||', 'or']);
    expect(splitPipes('  ')).toEqual([]);
    expect(splitPipes('a||b')).toEqual(['a', '', 'b']);
  });
});

describe('parseCsv', () => {
  it('reads escaped pipes in sample.csv as part of the answer, end to end', () => {
    const { cards, errors } = validateImport(parseCsv(sample('sample.csv')).cards, new Set());
    expect(errors).toEqual([]);
    const card = cards.find((c) => c.question.includes('pipe pair'))!;
    expect(card.answers).toEqual(['||', 'or']);
    expect(card.distractors).toEqual([]);
    expect(gradeWritten(card.answers, '||', true)).toBe(true);
    expect(gradeWritten(card.answers, 'OR', true)).toBe(true);
    expect(gradeWritten(card.answers, '|', true)).toBe(false);
    expect(gradeWritten(card.answers, '\\|\\|', true)).toBe(false);
  });

  it('requires the schema line', () => {
    const r = parseCsv('type,question,answers,distractors\nwritten,q,a,\n');
    expect(r.errors[0]).toMatchObject({ location: 'Line 1' });
  });

  it('rejects other schema versions and wrong headers', () => {
    expect(parseCsv('#schema=2\ntype,question,answers,distractors\n').errors[0].message).toMatch(/version 2/);
    expect(parseCsv('#schema=1\ntype,question,answer\n').errors[0]).toMatchObject({ location: 'Line 2' });
  });

  it('parses the example and the sample deck cleanly', () => {
    for (const text of [EXAMPLE_CSV, sample('sample.csv')]) {
      const r = parseCsv(text);
      expect(r.errors).toEqual([]);
      expect(validateImport(r.cards, new Set()).errors).toEqual([]);
    }
  });

  it('handles quoted multi-line cells and reports true line numbers', () => {
    const text = '#schema=1\ntype,question,answers,distractors\nwritten,"line one\nline two",a,\n\ntruefalse,q,maybe,\n';
    const r = parseCsv(text);
    expect(r.cards[0]).toMatchObject({ question: 'line one\nline two', location: 'Line 3' });
    expect(r.cards[1].location).toBe('Line 6');
    const v = validateImport(r.cards, new Set());
    expect(v.errors).toEqual([{ location: 'Line 6', message: expect.stringMatching(/true.*false/) }]);
  });

  it('flags rows with the wrong number of fields', () => {
    const r = parseCsv('#schema=1\ntype,question,answers,distractors\nwritten,What is 1,5?,1.5,\n');
    expect(r.errors[0]).toMatchObject({ location: 'Line 3', message: expect.stringMatching(/Expected 4 fields/) });
  });

  it('accepts Windows line endings and a BOM', () => {
    const r = parseCsv('﻿#schema=1\r\ntype,question,answers,distractors\r\nwritten,q,a,\r\n');
    expect(r.errors).toEqual([]);
    expect(r.cards).toHaveLength(1);
  });
});

describe('explanations', () => {
  it('reads "- explain:" in Markdown for every card type, unsplit and optional', () => {
    const r = parseMarkdown(
      '---\nschema: 1\n---\n### written\nq1\n- answer: a\n- explain: Because a \\|\\| b | c.\n' +
        '### multiple\nq2\n- explain: Before the answers is fine too.\n- correct: x\n- wrong: y\n### truefalse\nq3\n- answer: true\n',
    );
    expect(r.errors).toEqual([]);
    expect(r.cards.map((c) => c.explanation)).toEqual(['Because a \\|\\| b | c.', 'Before the answers is fine too.', '']);
  });

  it('accepts an optional explanation column in CSV, and still accepts the 4-column header', () => {
    const five = parseCsv('#schema=1\ntype,question,answers,distractors,explanation\nwritten,q,a,,"Short, with a comma."\ntruefalse,q2,true,,\n');
    expect(five.errors).toEqual([]);
    expect(five.cards.map((c) => c.explanation)).toEqual(['Short, with a comma.', '']);
    const four = parseCsv('#schema=1\ntype,question,answers,distractors\nwritten,q,a,\n');
    expect(four.errors).toEqual([]);
    expect(four.cards[0].explanation).toBe('');
    expect(parseCsv('#schema=1\ntype,question,answers,distractors,explanation\nwritten,q,a,\n').errors[0].message).toMatch(/Expected 5 fields/);
  });

  it('flags a repeated explain line', () => {
    const r = parseMarkdown('---\nschema: 1\n---\n### written\nq\n- answer: a\n- explain: one\n- explain: two\n');
    expect(r.errors[0]).toMatchObject({ location: 'Line 8', message: expect.stringMatching(/appears twice/) });
  });
});

describe('parseMarkdown', () => {
  it('parses the example and the sample deck cleanly', () => {
    for (const text of [EXAMPLE_MD, sample('sample.md')]) {
      const r = parseMarkdown(text);
      expect(r.errors).toEqual([]);
      expect(validateImport(r.cards, new Set()).errors).toEqual([]);
    }
    expect(parseMarkdown(sample('sample.md')).cards).toHaveLength(20);
  });

  it('keeps fenced code verbatim, including lines that look like answers', () => {
    const text = '---\nschema: 1\n---\n\n### written\nWhat is printed?\n```python\n- answer: not me\nprint("hi")\n```\n- answer: hi\n';
    const r = parseMarkdown(text);
    expect(r.errors).toEqual([]);
    expect(r.cards[0].question).toBe('What is printed?\n```python\n- answer: not me\nprint("hi")\n```');
    expect(r.cards[0].answers).toEqual(['hi']);
  });

  it('maps correct/wrong for multiple choice', () => {
    const r = parseMarkdown(EXAMPLE_MD);
    expect(r.cards[2]).toMatchObject({ type: 'multiple', answers: ['Merge sort', 'Quick sort'], distractors: ['Dijkstra', 'BFS'], location: 'Line 17' });
  });

  it('reports structural errors with line numbers', () => {
    expect(parseMarkdown('### written\nq\n- answer: a\n').errors[0].message).toMatch(/frontmatter/);
    expect(parseMarkdown('---\nschema: 3\n---\n').errors[0].message).toMatch(/version 3/);
    const r = parseMarkdown('---\nschema: 1\n---\nstray text\n### essay\nq\n- answer: a\n### written\nq2\n- correct: a\n### written\nq3\n```\nunclosed\n');
    expect(r.errors).toEqual([
      { location: 'Line 4', message: expect.stringMatching(/before the first/) },
      { location: 'Line 5', message: expect.stringMatching(/Unknown card type "essay"/) },
      { location: 'Line 8', message: expect.stringMatching(/"- correct:" is not used by written/) },
      { location: 'Line 13', message: expect.stringMatching(/never closed/) },
    ]);
  });

  it('flags text after the answer lines and repeated fields', () => {
    const r = parseMarkdown('---\nschema: 1\n---\n### written\nq\n- answer: a\n- answer: b\nmore\n');
    expect(r.errors.map((e) => e.location)).toEqual(['Line 7', 'Line 8']);
  });
});

describe('validateImport', () => {
  const card = (type: string, answers: string[], distractors: string[] = [], question = 'Q?', explanation = '') => ({ type, question, answers, distractors, explanation, location: 'Line 1' });
  const errorsFor = (c: ReturnType<typeof card>) => validateImport([c], new Set()).errors.map((e) => e.message);

  it('enforces the multiple-choice rules', () => {
    expect(errorsFor(card('multiple', ['A'], ['B']))).toEqual([]);
    expect(errorsFor(card('multiple', ['A', 'B']))).toEqual([]); // all options correct is allowed
    expect(errorsFor(card('multiple', [], ['A', 'B']))).toEqual([expect.stringMatching(/at least one correct/)]);
    expect(errorsFor(card('multiple', ['A']))).toEqual([expect.stringMatching(/at least two options/)]);
    expect(errorsFor(card('multiple', ['A'], ['a']))).toEqual([expect.stringMatching(/more than once/)]);
    expect(errorsFor(card('multiple', ['A'], ['None of the above']))).toEqual([expect.stringMatching(/all\/none/)]);
    expect(errorsFor(card('multiple', ['A', ''], ['B']))).toEqual([expect.stringMatching(/Empty item/)]);
  });

  it('rejects a multi-line explanation', () => {
    expect(errorsFor(card('written', ['a'], [], 'Q?', 'one line'))).toEqual([]);
    expect(errorsFor(card('written', ['a'], [], 'Q?', 'two\nlines'))).toEqual(['Explanation must be a single line.']);
  });

  it('enforces true/false and written rules', () => {
    expect(errorsFor(card('truefalse', ['TRUE']))).toEqual([]);
    expect(validateImport([card('truefalse', ['TRUE'])], new Set()).cards[0].answers).toEqual(['true']);
    expect(errorsFor(card('truefalse', ['yes']))).toHaveLength(1);
    expect(errorsFor(card('truefalse', ['true'], ['x']))).toHaveLength(1);
    expect(errorsFor(card('written', []))).toHaveLength(1);
    expect(errorsFor(card('written', ['a'], ['b']))).toHaveLength(1);
    expect(errorsFor(card('written', ['a'], [], '  '))).toEqual([expect.stringMatching(/Question is empty/)]);
  });

  it('blocks duplicates within the file, warns about duplicates of existing cards', () => {
    const r = validateImport(
      [
        { ...card('written', ['a'], [], 'What is X?'), location: 'Line 3' },
        { ...card('written', ['a'], [], 'what  is x?'), location: 'Line 7' },
        { ...card('written', ['a'], [], 'Old question'), location: 'Line 9' },
      ],
      new Set(['old question']),
    );
    expect(r.errors).toEqual([{ location: 'Line 7', message: 'Duplicate question (same as Line 3).' }]);
    expect(r.warnings).toEqual([{ location: 'Line 9', message: expect.any(String) }]);
    expect(r.cards.find((c) => c.question === 'Old question')?.duplicateOfExisting).toBe(true);
  });
});

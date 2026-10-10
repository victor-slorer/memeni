import { splitPipes, SUPPORTED_SCHEMA, type ImportIssue, type ParsedCard, type ParseResult } from './types';

const HEADING = /^###\s+(\S.*?)\s*$/;
const FIELD = /^-\s+(answer|correct|wrong)\s*:(.*)$/i;
const FENCE = /^\s*(```|~~~)/;

interface Draft {
  type: string;
  line: number;
  body: string[];
  fields: Map<string, string>;
  inFence: boolean;
  fenceLine: number;
}

/** Which fields each card type takes, mapped onto answers/distractors. */
const FIELDS_BY_TYPE: Record<string, { answers: string; distractors?: string }> = {
  written: { answers: 'answer' },
  truefalse: { answers: 'answer' },
  multiple: { answers: 'correct', distractors: 'wrong' },
};

export function parseMarkdown(input: string): ParseResult {
  const lines = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const errors: ImportIssue[] = [];
  const cards: ParsedCard[] = [];

  // Frontmatter with `schema: 1`
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (lines[i]?.trim() !== '---') {
    return { cards, errors: [{ location: `Line ${i + 1}`, message: 'File must start with frontmatter containing "schema: 1".' }] };
  }
  const fmStart = i;
  let schema: string | null = null;
  for (i++; i < lines.length && lines[i].trim() !== '---'; i++) {
    const m = /^schema\s*:\s*(\S+)\s*$/.exec(lines[i].trim());
    if (m) schema = m[1];
  }
  if (i >= lines.length) {
    return { cards, errors: [{ location: `Line ${fmStart + 1}`, message: 'Frontmatter is not closed with "---".' }] };
  }
  if (schema === null) {
    return { cards, errors: [{ location: `Line ${fmStart + 1}`, message: 'Frontmatter must contain "schema: 1".' }] };
  }
  if (Number(schema) !== SUPPORTED_SCHEMA) {
    return { cards, errors: [{ location: `Line ${fmStart + 1}`, message: `Unsupported schema version ${schema} (expected ${SUPPORTED_SCHEMA}).` }] };
  }
  i++;

  let draft: Draft | null = null;

  const finish = (d: Draft) => {
    const location = `Line ${d.line}`;
    if (d.inFence) {
      errors.push({ location: `Line ${d.fenceLine}`, message: 'Code block is never closed.' });
      return;
    }
    const spec = FIELDS_BY_TYPE[d.type];
    if (!spec) {
      errors.push({ location, message: `Unknown card type "${d.type}". Use written, truefalse or multiple.` });
      return;
    }
    for (const name of d.fields.keys()) {
      if (name !== spec.answers && name !== spec.distractors) {
        errors.push({ location, message: `"- ${name}:" is not used by ${d.type} cards.` });
      }
    }
    cards.push({
      type: d.type,
      question: d.body.join('\n').replace(/^\n+|\s+$/g, ''),
      answers: splitPipes(d.fields.get(spec.answers) ?? ''),
      distractors: spec.distractors ? splitPipes(d.fields.get(spec.distractors) ?? '') : [],
      location,
    });
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (draft?.inFence) {
      draft.body.push(line);
      if (FENCE.test(line)) draft.inFence = false;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      if (draft) finish(draft);
      draft = { type: heading[1].toLowerCase(), line: lineNo, body: [], fields: new Map(), inFence: false, fenceLine: 0 };
      continue;
    }

    if (!draft) {
      if (line.trim() !== '') errors.push({ location: `Line ${lineNo}`, message: 'Text before the first "### <type>" heading.' });
      continue;
    }

    const field = FIELD.exec(line.trim());
    if (field) {
      const name = field[1].toLowerCase();
      if (draft.fields.has(name)) {
        errors.push({ location: `Line ${lineNo}`, message: `"- ${name}:" appears twice in one card.` });
      }
      draft.fields.set(name, field[2]);
      continue;
    }

    if (draft.fields.size > 0) {
      if (line.trim() !== '') errors.push({ location: `Line ${lineNo}`, message: 'Unexpected text after the answer lines.' });
      continue;
    }

    if (FENCE.test(line)) {
      draft.inFence = true;
      draft.fenceLine = lineNo;
    }
    draft.body.push(line);
  }
  if (draft) finish(draft);

  return { cards, errors };
}

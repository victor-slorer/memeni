import Papa from 'papaparse';
import { splitPipes, SUPPORTED_SCHEMA, type ImportIssue, type ParsedCard, type ParseResult } from './types';

const HEADER = ['type', 'question', 'answers', 'distractors'];
const SCHEMA_LINE = /^#\s*schema\s*=\s*(\d+)\s*$/i;

function lineOf(text: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') n++;
  return n;
}

export function parseCsv(input: string): ParseResult {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const errors: ImportIssue[] = [];
  const cards: ParsedCard[] = [];

  const firstBreak = text.indexOf('\n');
  const firstLine = (firstBreak === -1 ? text : text.slice(0, firstBreak)).trim();
  const schema = SCHEMA_LINE.exec(firstLine);
  if (!schema) {
    return { cards, errors: [{ location: 'Line 1', message: 'The first line must be "#schema=1".' }] };
  }
  if (Number(schema[1]) !== SUPPORTED_SCHEMA) {
    return { cards, errors: [{ location: 'Line 1', message: `Unsupported schema version ${schema[1]} (expected ${SUPPORTED_SCHEMA}).` }] };
  }

  const body = firstBreak === -1 ? '' : text.slice(firstBreak + 1);
  const rows: { fields: string[]; line: number }[] = [];
  let prevCursor = 0;
  Papa.parse<string[]>(body, {
    delimiter: ',',
    step: (r) => {
      const line = lineOf(body, prevCursor) + 1; // +1 for the schema line
      prevCursor = r.meta.cursor;
      for (const e of r.errors) errors.push({ location: `Line ${line}`, message: `CSV: ${e.message}` });
      if (r.data.length === 1 && r.data[0].trim() === '') return; // blank line
      rows.push({ fields: r.data, line });
    },
  });

  if (rows.length === 0) {
    errors.push({ location: 'Line 2', message: `Missing header row "${HEADER.join(',')}".` });
    return { cards, errors };
  }

  const [header, ...data] = rows;
  const got = header.fields.map((h) => h.trim().toLowerCase());
  if (got.length !== HEADER.length || got.some((h, i) => h !== HEADER[i])) {
    errors.push({ location: `Line ${header.line}`, message: `Header must be exactly "${HEADER.join(',')}".` });
    return { cards, errors };
  }

  for (const { fields, line } of data) {
    const location = `Line ${line}`;
    if (fields.length !== HEADER.length) {
      errors.push({ location, message: `Expected ${HEADER.length} fields, found ${fields.length}. Quote fields that contain commas.` });
      continue;
    }
    const [type, question, answers, distractors] = fields;
    cards.push({
      type: type.trim().toLowerCase(),
      question: question.trim(),
      answers: splitPipes(answers),
      distractors: splitPipes(distractors),
      location,
    });
  }
  return { cards, errors };
}

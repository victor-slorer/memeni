import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeQuestion } from '../normalize';
import { parseMarkdown } from './markdown';
import { mergeDecks, splitCards } from './merge';
import { validateImport } from './validate';

const dir = new URL('../../../decks/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), 'utf8');
const topicFiles = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'all.md').sort();

describe('decks/', () => {
  it.each(topicFiles)('%s imports cleanly and every card has an explanation', (name) => {
    const parsed = parseMarkdown(read(name));
    const v = validateImport(parsed.cards, new Set());
    expect([...parsed.errors, ...v.errors]).toEqual([]);
    expect(v.cards.length).toBeGreaterThan(0);
    expect(v.cards.filter((c) => c.explanation === '').map((c) => c.location)).toEqual([]);
  });

  it('has no question in more than one deck', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const name of topicFiles) {
      for (const c of parseMarkdown(read(name)).cards) {
        const key = normalizeQuestion(c.question);
        if (seen.has(key)) dupes.push(`${name} ${c.location} = ${seen.get(key)}`);
        seen.set(key, `${name} ${c.location}`);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('all.md is up to date (run `npm run decks:merge` after editing a deck)', () => {
    const merged = mergeDecks(topicFiles.map((name) => ({ name, text: read(name) })));
    expect(read('all.md')).toBe(merged);
    const total = topicFiles.reduce((n, f) => n + splitCards(read(f)).length, 0);
    expect(parseMarkdown(read('all.md')).cards).toHaveLength(total);
  });
});

describe('mergeDecks', () => {
  it('interleaves decks round-robin and ignores headings inside code fences', () => {
    const a = '---\nschema: 1\n---\n\n### written\nA1\n```\n### not a card\n```\n- answer: x\n\n### written\nA2\n- answer: x\n';
    const b = '---\nschema: 1\n---\n### written\nB1\n- answer: x\n';
    const out = parseMarkdown(mergeDecks([{ name: 'b.md', text: b }, { name: 'a.md', text: a }]));
    expect(out.errors).toEqual([]);
    expect(out.cards.map((c) => c.question.split('\n')[0])).toEqual(['A1', 'B1', 'A2']);
  });
});

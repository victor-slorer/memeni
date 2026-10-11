// Regenerates decks/all.md from the topic decks. Run with `npm run decks:merge`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mergeDecks } from '../src/core/import/merge.ts';

const dir = new URL('../decks/', import.meta.url);
const decks = readdirSync(dir)
  .filter((f) => f.endsWith('.md') && f !== 'all.md')
  .map((name) => ({ name, text: readFileSync(new URL(name, dir), 'utf8') }));

const merged = mergeDecks(decks);
writeFileSync(new URL('all.md', dir), merged);
console.log(`decks/all.md: ${(merged.match(/^### /gm) ?? []).length} cards from ${decks.length} files`);

# memeni

Personal Leitner-style spaced-repetition flashcards for regaining knowledge over time.

- 6 bins with intervals 1, 2, 4, 8, 16, 32 days, then "graduated" (every 64 days)
- Due-date scheduling; time-boxed sessions (default 15 min); new cards wait in limbo and are released 10 per day
- Card types: written (accepted-answer list), true/false, multiple choice (several correct, count hidden)
- After each answer you can override the destination bin (1 … current + 1)
- CSV and Markdown import (schema v1), JSON backup, stats, streak with freezes
- Desktop web app; data lives in the browser's IndexedDB. No accounts, no server.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
```

Always use `npm run dev`. IndexedDB is scoped to the origin, port included: the dev server
is pinned to port 5173 (`strictPort`) so your data is always found. `vite preview` uses
another port and would show an empty deck. Export a JSON backup from Settings now and then.

Try it with `samples/sample.md` (20 CS interview cards) on the Import screen.

## Develop

```sh
npm test           # Vitest: core logic + storage (fake-indexeddb)
npm run typecheck
npm run lint       # oxlint
npm run build
```

## Layout

```
src/core/      pure logic, no React or storage (scheduler, queue, grading, daily rollover, streak, stats, import)
src/storage/   IndexedDB via idb (repo.ts), JSON backup
src/ui/        React screens: Today, Session, Cards, Import, Stats, Settings
samples/       example decks, also used as test fixtures
```

The design spec lives in the Obsidian vault: `01-projects/memeni/` (architecture, decisions).

## Keyboard (session)

- <kbd>Enter</kbd> check / continue
- <kbd>T</kbd> / <kbd>F</kbd> true / false
- <kbd>1</kbd>–<kbd>9</kbd> toggle multiple-choice options
- <kbd>1</kbd>–<kbd>7</kbd> pick the destination bin on the result screen

# CLAUDE.md — memeni

Spec and project memory live in the Obsidian vault: `~/obsidian/main/01-projects/memeni/`
(README → current state, architecture.md → data model and rules, decisions.md → why).
Read the vault README before changing behaviour, and follow `~/obsidian/main/CLAUDE.md`
when updating it.

## Rules
- `src/core/` stays pure TypeScript: no React, no IndexedDB, no `Date.now()`/`Math.random()`.
  "today", timestamps and the RNG are passed in so everything is deterministic in tests.
- All persistence goes through `src/storage/repo.ts`. An answer is committed (card + log entry
  + session counter) in one transaction.
- Every "today" comes from `core/clock.ts` `today()` (honours the debug override).
- Logic changes come with Vitest tests (`npm test`). Keep `npm run typecheck`, `npm run lint`
  and `npm run build` clean.
- TypeScript runs with `erasableSyntaxOnly`: no enums, no constructor parameter properties.
- Keep the dev server on port 5173 (`strictPort`). IndexedDB data is per origin, port included.

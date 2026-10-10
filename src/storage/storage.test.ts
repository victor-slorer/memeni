import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { commit, evaluate } from '../core/review';
import { seeded } from '../core/test-utils';
import { exportBackup, parseBackup, restoreBackup } from './backup';
import { openMemeniDB } from './db';
import { Repo, type NewCard } from './repo';

let dbCounter = 0;
async function makeRepo(date = '2026-10-10T08:00:00') {
  const db = await openMemeniDB(`test-${++dbCounter}`);
  let ids = 0;
  const clock = { now: new Date(date) };
  const repo = new Repo(db, () => clock.now, () => `id-${++ids}`);
  return { db, repo, clock };
}

const written = (q: string): NewCard => ({ type: 'written', question: q, answers: ['a'], distractors: [] });

describe('Repo', () => {
  it('adds cards to limbo in order, after existing cards', async () => {
    const { repo } = await makeRepo();
    await repo.addCards([written('q1'), written('q2')]);
    await repo.addCards([written('q3')]);
    const cards = (await repo.getAllCards()).sort((a, b) => a.importOrder - b.importOrder);
    expect(cards.map((c) => [c.question, c.importOrder, c.level, c.dueDate])).toEqual([
      ['q1', 0, 0, null],
      ['q2', 1, 0, null],
      ['q3', 2, 0, null],
    ]);
  });

  it('shuffles an import on request, still after existing cards', async () => {
    const { repo } = await makeRepo();
    await repo.addCards([written('first')]);
    const batch = Array.from({ length: 10 }, (_, i) => written(`q${i}`));
    await repo.addCards(batch, { shuffle: true, rng: seeded(4) });
    const cards = (await repo.getAllCards()).sort((a, b) => a.importOrder - b.importOrder);
    expect(cards[0].question).toBe('first');
    expect(cards.slice(1).map((c) => c.question)).not.toEqual(batch.map((c) => c.question));
  });

  it('runs the rollover once per day and persists released cards', async () => {
    const { repo, clock } = await makeRepo();
    await repo.addCards(Array.from({ length: 15 }, (_, i) => written(`q${i}`)));
    expect(await repo.runRollover()).toEqual({ released: 10, completedWithNothingDue: false });
    expect(await repo.runRollover()).toEqual({ released: 0, completedWithNothingDue: false });
    expect((await repo.getAllCards()).filter((c) => c.level === 1 && c.dueDate === '2026-10-10')).toHaveLength(10);
    clock.now = new Date('2026-10-11T08:00:00');
    expect((await repo.runRollover()).released).toBe(5);
  });

  it('honours the debug today override', async () => {
    const { repo } = await makeRepo();
    await repo.setDebugToday('2027-01-01');
    expect(await repo.today()).toBe('2027-01-01');
    await repo.setDebugToday(null);
    expect(await repo.today()).toBe('2026-10-10');
  });

  it('commits an answer atomically and completes the day on a finished session', async () => {
    const { repo } = await makeRepo();
    await repo.addCards([written('q1')]);
    await repo.runRollover();
    const [card] = await repo.getAllCards();
    const settings = await repo.getSettings();
    const session = await repo.startSession('2026-10-10');

    const p = evaluate(card, ['a'], false, settings);
    const { card: updated, log } = commit(p, p.autoLevel, '2026-10-10', 'now', { logId: '', sessionId: session.id }, settings);
    await repo.commitAnswer(updated, log);

    expect(await repo.getCard(card.id)).toMatchObject({ level: 2, dueDate: '2026-10-12' });
    expect(await repo.getReviewLog()).toHaveLength(1);
    expect((await repo.getSessions())[0].cardsAnswered).toBe(1);

    const meta = await repo.endSession(session.id, true);
    expect(meta.streak).toMatchObject({ current: 1, lastCompletedDate: '2026-10-10' });
    expect((await repo.getMeta()).streak.current).toBe(1);
  });

  it('does not count an abandoned session for the streak', async () => {
    const { repo } = await makeRepo();
    const session = await repo.startSession('2026-10-10');
    await repo.endSession(session.id, false);
    expect((await repo.getMeta()).streak.current).toBe(0);
    expect((await repo.getSessions())[0].completed).toBe(false);
  });

  it('counts a day with nothing due once, and writes a session record for it', async () => {
    const { repo } = await makeRepo();
    const [card] = await repo.addCards([written('q1')]);
    await repo.db.put('cards', { ...card, level: 3, dueDate: '2026-10-20' });
    await repo.saveMeta({ ...(await repo.getMeta()), lastReleaseDate: '2026-10-10' });
    expect((await repo.runRollover()).completedWithNothingDue).toBe(true);
    expect((await repo.runRollover()).completedWithNothingDue).toBe(false);
    expect(await repo.getSessions()).toHaveLength(1);
    expect((await repo.getMeta()).streak.current).toBe(1);
  });

  it('resets dates relative to today, keeping levels', async () => {
    const { repo } = await makeRepo();
    const [a, b] = await repo.addCards([written('q1'), written('q2')]);
    await repo.db.put('cards', { ...a, level: 4, dueDate: '2026-09-01' });
    expect(await repo.resetDates()).toBe(1);
    expect(await repo.getCard(a.id)).toMatchObject({ level: 4, dueDate: '2026-10-18' });
    expect(await repo.getCard(b.id)).toMatchObject({ level: 0, dueDate: null });
  });

  it('edits content without touching scheduling, and deletes', async () => {
    const { repo } = await makeRepo();
    const [a] = await repo.addCards([written('q1')]);
    await repo.db.put('cards', { ...a, level: 5, dueDate: '2026-10-30' });
    await repo.updateCardContent(a.id, { type: 'written', question: 'edited', answers: ['b'], distractors: [] });
    expect(await repo.getCard(a.id)).toMatchObject({ question: 'edited', answers: ['b'], level: 5, dueDate: '2026-10-30' });
    await repo.deleteCard(a.id);
    expect(await repo.getCard(a.id)).toBeUndefined();
  });
});

describe('backup', () => {
  it('round-trips export → restore into an empty database', async () => {
    const { db, repo } = await makeRepo();
    await repo.addCards([written('q1'), written('q2')]);
    await repo.runRollover();
    await repo.saveSettings({ ...(await repo.getSettings()), sessionMinutes: 20 });
    const session = await repo.startSession('2026-10-10');
    await repo.endSession(session.id, true);

    const exported = await exportBackup(db);
    const parsed = parseBackup(JSON.stringify(exported));

    const { db: db2, repo: repo2 } = await makeRepo();
    await repo2.addCards([written('will be replaced')]);
    await restoreBackup(db2, parsed);

    const again = await exportBackup(db2, new Date(exported.exportedAt));
    expect(again).toEqual(exported);
    expect((await repo2.getSettings()).sessionMinutes).toBe(20);
  });

  it('rejects files that are not memeni backups', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/memeni/);
    expect(() => parseBackup('{"app":"memeni","schemaVersion":1,"cards":[]}')).toThrow(/reviewLog/);
  });
});

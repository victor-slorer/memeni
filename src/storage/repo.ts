import { today as clockToday } from '../core/clock';
import { rollover } from '../core/daily';
import type { ValidCard } from '../core/import/types';
import { normalizeQuestion } from '../core/normalize';
import { shuffle } from '../core/queue';
import { restartSchedule } from '../core/scheduler';
import { markDayCompleted } from '../core/streak';
import {
  DEFAULT_META,
  DEFAULT_SETTINGS,
  LIMBO,
  type Card,
  type CardType,
  type DateStr,
  type Meta,
  type ReviewLogEntry,
  type Rng,
  type SessionRecord,
  type Settings,
} from '../core/types';
import type { DB } from './db';

export type NewCard = Pick<Card, 'type' | 'question' | 'answers' | 'distractors'> & { explanation?: string };

/** Cards stored before a field existed (or restored from an old backup) get its default. */
function withDefaults(c: Card): Card {
  return { ...c, explanation: c.explanation ?? '' };
}

/** All persistence goes through here. `now` is injectable for tests. */
export class Repo {
  readonly db: DB;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(db: DB, now: () => Date = () => new Date(), newId: () => string = () => crypto.randomUUID()) {
    this.db = db;
    this.now = now;
    this.newId = newId;
  }

  private nowIso(): string {
    return this.now().toISOString();
  }

  // ---- settings & meta -------------------------------------------------

  async getSettings(): Promise<Settings> {
    const s = (await this.db.get('kv', 'settings')) as Settings | undefined;
    return { ...DEFAULT_SETTINGS, ...s };
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.db.put('kv', settings, 'settings');
  }

  async getMeta(): Promise<Meta> {
    const m = (await this.db.get('kv', 'meta')) as Meta | undefined;
    return m ? { ...DEFAULT_META, ...m, streak: { ...DEFAULT_META.streak, ...m.streak } } : DEFAULT_META;
  }

  async saveMeta(meta: Meta): Promise<void> {
    await this.db.put('kv', meta, 'meta');
  }

  /** The app's single notion of "today" (honours the debug override). */
  async today(): Promise<DateStr> {
    return clockToday((await this.getMeta()).debugTodayOverride, this.now());
  }

  async setDebugToday(date: DateStr | null): Promise<void> {
    await this.saveMeta({ ...(await this.getMeta()), debugTodayOverride: date });
  }

  // ---- cards -----------------------------------------------------------

  async getAllCards(): Promise<Card[]> {
    return (await this.db.getAll('cards')).map(withDefaults);
  }

  async getCard(id: string): Promise<Card | undefined> {
    const c = await this.db.get('cards', id);
    return c && withDefaults(c);
  }

  async existingQuestionKeys(): Promise<Set<string>> {
    return new Set((await this.getAllCards()).map((c) => normalizeQuestion(c.question)));
  }

  private async nextImportOrder(): Promise<number> {
    const cursor = await this.db.transaction('cards').store.index('importOrder').openCursor(null, 'prev');
    return cursor ? cursor.value.importOrder + 1 : 0;
  }

  /** New cards always start in limbo, released after every existing limbo card. */
  async addCards(cards: readonly NewCard[], opts: { shuffle?: boolean; rng?: Rng } = {}): Promise<Card[]> {
    const ordered = opts.shuffle ? shuffle(cards, opts.rng ?? Math.random) : [...cards];
    let order = await this.nextImportOrder();
    const ts = this.nowIso();
    const created: Card[] = ordered.map((c) => ({
      id: this.newId(),
      type: c.type,
      question: c.question,
      answers: c.answers,
      distractors: c.distractors,
      explanation: c.explanation ?? '',
      level: LIMBO,
      dueDate: null,
      lastReviewedDate: null,
      importOrder: order++,
      createdAt: ts,
      updatedAt: ts,
    }));
    const tx = this.db.transaction('cards', 'readwrite');
    await Promise.all([...created.map((c) => tx.store.put(c)), tx.done]);
    return created;
  }

  async importCards(cards: readonly ValidCard[], opts: { shuffle: boolean; skipDuplicates: boolean; rng?: Rng }): Promise<Card[]> {
    const chosen = opts.skipDuplicates ? cards.filter((c) => !c.duplicateOfExisting) : cards;
    return this.addCards(chosen, opts);
  }

  /** Edit content only; scheduling is untouched. */
  async updateCardContent(id: string, content: NewCard & { type: CardType }): Promise<Card> {
    const card = await this.getCard(id);
    if (!card) throw new Error(`Card ${id} not found`);
    const updated = { ...card, ...content, explanation: content.explanation ?? card.explanation, updatedAt: this.nowIso() };
    await this.db.put('cards', updated);
    return updated;
  }

  /** Review log entries are kept; stats tolerate missing cards. */
  async deleteCard(id: string): Promise<void> {
    await this.db.delete('cards', id);
  }

  async resetDates(): Promise<number> {
    const [cards, settings, today] = await Promise.all([this.getAllCards(), this.getSettings(), this.today()]);
    const updated = restartSchedule(cards, today, this.nowIso(), settings);
    const tx = this.db.transaction('cards', 'readwrite');
    await Promise.all([...updated.map((c) => tx.store.put(c)), tx.done]);
    return updated.length;
  }

  // ---- daily rollover --------------------------------------------------

  /** Release limbo cards, check the streak, count a day with nothing due. Safe to call repeatedly. */
  async runRollover(): Promise<{ released: number; completedWithNothingDue: boolean }> {
    const [cards, meta, settings] = await Promise.all([this.getAllCards(), this.getMeta(), this.getSettings()]);
    const today = clockToday(meta.debugTodayOverride, this.now());
    const ts = this.nowIso();
    const r = rollover(cards, meta, settings, today, ts);

    const tx = this.db.transaction(['cards', 'kv', 'sessions'], 'readwrite');
    const writes: Promise<unknown>[] = r.released.map((c) => tx.objectStore('cards').put(c));
    writes.push(tx.objectStore('kv').put(r.meta, 'meta'));
    if (r.completedWithNothingDue) {
      writes.push(tx.objectStore('sessions').put({ id: this.newId(), date: today, start: ts, end: ts, completed: true, cardsAnswered: 0 }));
    }
    await Promise.all([...writes, tx.done]);
    return { released: r.released.length, completedWithNothingDue: r.completedWithNothingDue };
  }

  // ---- sessions --------------------------------------------------------

  async startSession(date: DateStr): Promise<SessionRecord> {
    const s: SessionRecord = { id: this.newId(), date, start: this.nowIso(), end: null, completed: false, cardsAnswered: 0 };
    await this.db.put('sessions', s);
    return s;
  }

  /** Persist one answer: card update, log entry and session counter in a single transaction. */
  async commitAnswer(card: Card, log: Omit<ReviewLogEntry, 'id'>): Promise<ReviewLogEntry> {
    const entry: ReviewLogEntry = { ...log, id: this.newId() };
    const tx = this.db.transaction(['cards', 'reviewLog', 'sessions'], 'readwrite');
    const sessions = tx.objectStore('sessions');
    const session = await sessions.get(log.sessionId);
    if (!session) throw new Error(`Session ${log.sessionId} not found`);
    await Promise.all([
      tx.objectStore('cards').put(card),
      tx.objectStore('reviewLog').put(entry),
      sessions.put({ ...session, cardsAnswered: session.cardsAnswered + 1, end: this.nowIso() }),
      tx.done,
    ]);
    return entry;
  }

  /** Close a session. A completed session counts the day for the streak. */
  async endSession(sessionId: string, completed: boolean): Promise<Meta> {
    const tx = this.db.transaction(['sessions', 'kv'], 'readwrite');
    const sessions = tx.objectStore('sessions');
    const kv = tx.objectStore('kv');
    const session = await sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const stored = (await kv.get('meta')) as Meta | undefined;
    let meta: Meta = stored ? { ...DEFAULT_META, ...stored } : DEFAULT_META;
    await sessions.put({ ...session, completed, end: this.nowIso() });
    if (completed) {
      meta = { ...meta, streak: markDayCompleted(meta.streak, session.date) };
      await kv.put(meta, 'meta');
    }
    await tx.done;
    return meta;
  }

  getSessions(): Promise<SessionRecord[]> {
    return this.db.getAll('sessions');
  }

  getReviewLog(): Promise<ReviewLogEntry[]> {
    return this.db.getAll('reviewLog');
  }
}

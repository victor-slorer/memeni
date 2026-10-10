import { DB_SCHEMA_VERSION, type Card, type Meta, type ReviewLogEntry, type SessionRecord, type Settings } from '../core/types';
import type { DB } from './db';

export interface Backup {
  app: 'memeni';
  schemaVersion: number;
  exportedAt: string;
  cards: Card[];
  reviewLog: ReviewLogEntry[];
  sessions: SessionRecord[];
  settings: Settings | null;
  meta: Meta | null;
}

export async function exportBackup(db: DB, now: Date = new Date()): Promise<Backup> {
  const tx = db.transaction(['cards', 'reviewLog', 'sessions', 'kv']);
  const [cards, reviewLog, sessions, settings, meta] = await Promise.all([
    tx.objectStore('cards').getAll(),
    tx.objectStore('reviewLog').getAll(),
    tx.objectStore('sessions').getAll(),
    tx.objectStore('kv').get('settings'),
    tx.objectStore('kv').get('meta'),
  ]);
  await tx.done;
  return {
    app: 'memeni',
    schemaVersion: DB_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    cards,
    reviewLog,
    sessions,
    settings: (settings as Settings | undefined) ?? null,
    meta: (meta as Meta | undefined) ?? null,
  };
}

/** Throws with a readable message if `data` doesn't look like a memeni backup. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not a JSON file.');
  }
  const b = data as Partial<Backup>;
  if (!b || typeof b !== 'object' || b.app !== 'memeni') throw new Error('Not a memeni backup.');
  if (b.schemaVersion !== DB_SCHEMA_VERSION) throw new Error(`Unsupported backup version ${String(b.schemaVersion)}.`);
  for (const key of ['cards', 'reviewLog', 'sessions'] as const) {
    if (!Array.isArray(b[key])) throw new Error(`Backup is missing "${key}".`);
  }
  if (b.cards!.some((c) => typeof c?.id !== 'string' || typeof c?.question !== 'string')) {
    throw new Error('Backup contains malformed cards.');
  }
  return b as Backup;
}

/** Replaces everything in the database with the backup, atomically. */
export async function restoreBackup(db: DB, backup: Backup): Promise<void> {
  const tx = db.transaction(['cards', 'reviewLog', 'sessions', 'kv'], 'readwrite');
  const cards = tx.objectStore('cards');
  const log = tx.objectStore('reviewLog');
  const sessions = tx.objectStore('sessions');
  const kv = tx.objectStore('kv');
  await Promise.all([cards.clear(), log.clear(), sessions.clear(), kv.clear()]);
  const writes: Promise<unknown>[] = [
    ...backup.cards.map((c) => cards.put(c)),
    ...backup.reviewLog.map((e) => log.put(e)),
    ...backup.sessions.map((s) => sessions.put(s)),
  ];
  if (backup.settings) writes.push(kv.put(backup.settings, 'settings'));
  if (backup.meta) writes.push(kv.put(backup.meta, 'meta'));
  await Promise.all([...writes, tx.done]);
}

export function backupFileName(now: Date = new Date()): string {
  return `memeni-backup-${now.toISOString().slice(0, 10)}.json`;
}

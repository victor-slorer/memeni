import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card, DateStr, Meta, ReviewLogEntry, SessionRecord, Settings } from '../core/types';

export interface MemeniDB extends DBSchema {
  cards: {
    key: string;
    value: Card;
    indexes: { level: number; dueDate: DateStr; importOrder: number };
  };
  reviewLog: {
    key: string;
    value: ReviewLogEntry;
    indexes: { cardId: string; date: DateStr };
  };
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { date: DateStr };
  };
  kv: {
    key: 'settings' | 'meta';
    value: Settings | Meta;
  };
}

export type DB = IDBPDatabase<MemeniDB>;

export const DB_NAME = 'memeni';
const DB_VERSION = 1;

export function openMemeniDB(name: string = DB_NAME): Promise<DB> {
  return openDB<MemeniDB>(name, DB_VERSION, {
    upgrade(db) {
      const cards = db.createObjectStore('cards', { keyPath: 'id' });
      cards.createIndex('level', 'level');
      cards.createIndex('dueDate', 'dueDate');
      cards.createIndex('importOrder', 'importOrder');

      const log = db.createObjectStore('reviewLog', { keyPath: 'id' });
      log.createIndex('cardId', 'cardId');
      log.createIndex('date', 'date');

      const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
      sessions.createIndex('date', 'date');

      db.createObjectStore('kv');
    },
  });
}

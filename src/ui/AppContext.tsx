import { createContext, useContext } from 'react';
import type { DateStr, Meta, Settings } from '../core/types';
import type { Repo } from '../storage/repo';

export interface AppState {
  repo: Repo;
  settings: Settings;
  meta: Meta;
  today: DateStr;
  /** Bumped by refresh(); screens reload their data when it changes. */
  version: number;
  /** Re-run the rollover and reload settings/meta. */
  refresh: () => Promise<void>;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppContext');
  return ctx;
}

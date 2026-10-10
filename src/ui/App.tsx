import { useCallback, useEffect, useState } from 'react';
import { today as clockToday } from '../core/clock';
import { openMemeniDB } from '../storage/db';
import { Repo } from '../storage/repo';
import { AppContext, type AppState } from './AppContext';
import { Cards } from './Cards';
import { Dashboard } from './Dashboard';
import { Import } from './Import';
import { Session } from './Session';
import { SettingsScreen } from './Settings';
import { Stats } from './Stats';

type Tab = 'dashboard' | 'cards' | 'import' | 'stats' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'cards', label: 'Cards' },
  { id: 'import', label: 'Import' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  const [state, setState] = useState<Omit<AppState, 'refresh'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [inSession, setInSession] = useState(false);

  const load = useCallback(async (repo: Repo) => {
    await repo.runRollover();
    const [settings, meta] = await Promise.all([repo.getSettings(), repo.getMeta()]);
    setState((prev) => ({
      repo,
      settings,
      meta,
      today: clockToday(meta.debugTodayOverride),
      version: (prev?.version ?? 0) + 1,
    }));
  }, []);

  useEffect(() => {
    (async () => {
      const repo = new Repo(await openMemeniDB());
      void navigator.storage?.persist?.();
      await load(repo);
    })().catch((e: unknown) => setError(String(e)));
  }, [load]);

  // A tab left open past midnight rolls over when it regains focus.
  useEffect(() => {
    if (!state || inSession) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load(state.repo);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [state, inSession, load]);

  if (error) return <div className="app"><div className="banner bad">Could not open the database: {error}</div></div>;
  if (!state) return <div className="app"><p className="muted">Loading…</p></div>;

  const ctx: AppState = { ...state, refresh: () => load(state.repo) };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <span className="brand">memeni</span>
          {!inSession && (
            <nav className="tabs">
              {TABS.map((t) => (
                <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </nav>
          )}
        </header>
        {state.meta.debugTodayOverride && (
          <div className="banner warn">
            Debug date active: “today” is <strong>{state.meta.debugTodayOverride}</strong>. Clear it in Settings.
          </div>
        )}
        {inSession ? (
          <Session onExit={() => { setInSession(false); void ctx.refresh(); }} />
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard onStart={() => setInSession(true)} onGoTo={setTab} />}
            {tab === 'cards' && <Cards />}
            {tab === 'import' && <Import />}
            {tab === 'stats' && <Stats />}
            {tab === 'settings' && <SettingsScreen />}
          </>
        )}
      </div>
    </AppContext.Provider>
  );
}

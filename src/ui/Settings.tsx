import { useEffect, useState } from 'react';
import { addDays } from '../core/clock';
import type { Settings } from '../core/types';
import { backupFileName, exportBackup, parseBackup, restoreBackup } from '../storage/backup';
import { useApp } from './AppContext';
import { downloadText } from './util';

export function SettingsScreen() {
  const { repo, settings, meta, today, refresh } = useApp();
  const [draft, setDraft] = useState<Settings>(settings);
  const [message, setMessage] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);
  const [debugDate, setDebugDate] = useState(meta.debugTodayOverride ?? today);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const say = (kind: 'good' | 'bad', text: string) => setMessage({ kind, text });

  async function save() {
    const clean: Settings = {
      ...draft,
      sessionMinutes: Math.min(120, Math.max(1, Math.round(draft.sessionMinutes) || 15)),
      newCardsPerDay: Math.min(200, Math.max(0, Math.round(draft.newCardsPerDay) || 0)),
      penalty: draft.penalty.mode === 'drop' ? { mode: 'drop', bins: Math.min(6, Math.max(1, Math.round(draft.penalty.bins) || 1)) } : { mode: 'reset' },
    };
    await repo.saveSettings(clean);
    setDraft(clean);
    await refresh();
    say('good', 'Settings saved.');
  }

  async function resetDates() {
    if (!confirm('Reschedule every card in bins 1–7 as if it had been reviewed today? Levels are kept; limbo is untouched.')) return;
    const n = await repo.resetDates();
    await refresh();
    say('good', `Rescheduled ${n} cards from today.`);
  }

  async function doExport() {
    const backup = await exportBackup(repo.db);
    downloadText(backupFileName(), JSON.stringify(backup, null, 2), 'application/json');
  }

  async function doRestore(file: File) {
    try {
      const backup = parseBackup(await file.text());
      if (!confirm(`Replace ALL current data with this backup (${backup.cards.length} cards, exported ${backup.exportedAt})? This cannot be undone.`)) return;
      await restoreBackup(repo.db, backup);
      setDraft(await repo.getSettings());
      await refresh();
      say('good', `Restored ${backup.cards.length} cards.`);
    } catch (e) {
      say('bad', `Restore failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function setDebug(date: string | null) {
    await repo.setDebugToday(date);
    await refresh();
    say('good', date ? `“Today” is now ${date}.` : 'Debug date cleared.');
  }

  return (
    <>
      {message && <div className={`banner ${message.kind}`}>{message.text}</div>}

      <div className="panel stack">
        <h2>Settings</h2>
        <div className="grid">
          <label className="field">
            Session length (minutes)
            <input type="number" min={1} max={120} value={draft.sessionMinutes} onChange={(e) => setDraft({ ...draft, sessionMinutes: Number(e.target.value) })} />
          </label>
          <label className="field">
            New cards per day
            <input type="number" min={0} max={200} value={draft.newCardsPerDay} onChange={(e) => setDraft({ ...draft, newCardsPerDay: Number(e.target.value) })} />
          </label>
        </div>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }} className="stack">
          <legend className="small" style={{ marginBottom: '0.4rem' }}>Penalty for a wrong answer</legend>
          <label className="check">
            <input type="radio" checked={draft.penalty.mode === 'reset'} onChange={() => setDraft({ ...draft, penalty: { mode: 'reset' } })} />
            Reset to bin 1
          </label>
          <label className="check">
            <input type="radio" checked={draft.penalty.mode === 'drop'} onChange={() => setDraft({ ...draft, penalty: { mode: 'drop', bins: draft.penalty.mode === 'drop' ? draft.penalty.bins : 2 } })} />
            Drop
            <input
              type="number"
              min={1}
              max={6}
              style={{ width: '4rem' }}
              disabled={draft.penalty.mode !== 'drop'}
              value={draft.penalty.mode === 'drop' ? draft.penalty.bins : 2}
              onChange={(e) => setDraft({ ...draft, penalty: { mode: 'drop', bins: Number(e.target.value) } })}
            />
            bins (never below bin 1; graduated counts as level 7)
          </label>
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={draft.stripLeadingArticles} onChange={(e) => setDraft({ ...draft, stripLeadingArticles: e.target.checked })} />
          Ignore a leading “a”, “an” or “the” when checking written answers
        </label>
        <p className="small muted">
          Intervals: bins 1–6 every {settings.intervals.join(', ')} days; graduated every {settings.graduatedInterval} days.
        </p>
        <div className="row">
          <button className="primary" disabled={!dirty} onClick={save}>Save settings</button>
          {dirty && <button onClick={() => setDraft(settings)}>Discard</button>}
        </div>
      </div>

      <div className="panel stack">
        <h3>Backlog</h3>
        <p className="small muted">Restart the schedule: every card in bins 1–7 gets a new due date of today + its bin's interval. Use this after a long break.</p>
        <div><button onClick={resetDates}>Reset dates…</button></div>
      </div>

      <div className="panel stack">
        <h3>Backup</h3>
        <p className="small muted">
          Data lives in this browser only (IndexedDB at {location.origin}).
          {persisted === true && ' Storage is marked persistent.'}
          {persisted === false && ' Storage is not marked persistent, so the browser may evict it under pressure. Export regularly.'}
        </p>
        <div className="row">
          <button onClick={doExport}>Export JSON backup</button>
          <label className="btn">
            Restore from backup…
            <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void doRestore(f); e.target.value = ''; }} />
          </label>
        </div>
      </div>

      <div className="panel stack">
        <h3>Debug: override “today”</h3>
        <p className="small muted">
          For testing long intervals. Export a backup first: moving the date forward and back can leave release dates in
          the future.
        </p>
        <div className="row">
          <input type="date" value={debugDate} onChange={(e) => setDebugDate(e.target.value)} />
          <button onClick={() => setDebug(debugDate)} disabled={!debugDate}>Set</button>
          <button onClick={() => { const d = addDays(meta.debugTodayOverride ?? today, 1); setDebugDate(d); void setDebug(d); }}>+1 day</button>
          {meta.debugTodayOverride && <button onClick={() => setDebug(null)}>Clear</button>}
        </div>
        <p className="small muted">Current “today”: {today}{meta.debugTodayOverride ? ' (overridden)' : ''}</p>
      </div>
    </>
  );
}

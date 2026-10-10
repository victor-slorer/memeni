import { isDue } from '../core/queue';
import { daysBetween } from '../core/clock';
import { levelLabel, MAX_FREEZES, type Level } from '../core/types';
import { useApp } from './AppContext';
import { useLoad } from './util';

const LEVELS: Level[] = [0, 1, 2, 3, 4, 5, 6, 7];

export function Dashboard({ onStart, onGoTo }: { onStart: () => void; onGoTo: (tab: 'import') => void }) {
  const { repo, meta, today, settings, version } = useApp();
  const cards = useLoad(() => repo.getAllCards(), [repo, version]);
  if (!cards) return null;

  const due = cards.filter((c) => isDue(c, today));
  const overdue = due.filter((c) => c.dueDate! < today).length;
  const perLevel = LEVELS.map((l) => cards.filter((c) => c.level === l).length);
  const upcoming = cards.filter((c) => c.level >= 1 && c.dueDate! > today).map((c) => c.dueDate!).sort();
  const next = upcoming[0];
  const { streak } = meta;
  const doneToday = streak.lastCompletedDate === today;

  if (cards.length === 0) {
    return (
      <div className="panel stack">
        <h2>No cards yet</h2>
        <p className="muted">Import a CSV or Markdown file to get started. New cards wait in limbo and are released {settings.newCardsPerDay} per day.</p>
        <button className="primary" onClick={() => onGoTo('import')}>Import cards</button>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="stat">
            <span className="value">{due.length}</span>
            <span className="label">due today{overdue > 0 && ` (${overdue} overdue)`}</span>
          </div>
          <div className="spacer" />
          <div className="stack" style={{ textAlign: 'right' }}>
            <button className="primary big" disabled={due.length === 0} onClick={onStart}>
              Start {settings.sessionMinutes}-minute session
            </button>
            {due.length === 0 && (
              <p className="small muted">
                Nothing due{next ? `. Next card due ${next} (in ${daysBetween(today, next)} days)` : ''}.
                {doneToday && ' Today counts toward your streak.'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="panel stat">
          <span className="value">{streak.current}</span>
          <span className="label">day streak{doneToday ? ' · done today ✓' : ''}</span>
          <span className="small muted">Longest {streak.longest}</span>
        </div>
        <div className="panel stat">
          <span className="value">{'❄'.repeat(streak.freezes) || '0'}</span>
          <span className="label">freezes ({streak.freezes}/{MAX_FREEZES})</span>
          <span className="small muted">Earn one every 7 days</span>
        </div>
        <div className="panel stat">
          <span className="value">{perLevel[0]}</span>
          <span className="label">in limbo</span>
          <span className="small muted">{settings.newCardsPerDay} released per day</span>
        </div>
        <div className="panel stat">
          <span className="value">{perLevel[7]}</span>
          <span className="label">graduated</span>
          <span className="small muted">of {cards.length} cards</span>
        </div>
      </div>

      <div className="panel stack">
        <h3>Deck</h3>
        <div className="levels" aria-hidden>
          {LEVELS.slice(1).map((l, i) =>
            perLevel[l] ? (
              <span key={l} style={{ flex: perLevel[l], background: `color-mix(in srgb, var(--accent) ${25 + i * 12}%, transparent)` }} />
            ) : null,
          )}
        </div>
        <div className="row small">
          {LEVELS.map((l) => (
            <span key={l} className="pill">{levelLabel(l)}: {perLevel[l]}</span>
          ))}
        </div>
      </div>
    </>
  );
}

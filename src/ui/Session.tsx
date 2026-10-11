import { useEffect, useRef, useState } from 'react';
import { multipleBreakdown } from '../core/grading';
import { buildQueue, insertRetry, shuffle, type QueueItem } from '../core/queue';
import { commit, evaluate, type PendingReview } from '../core/review';
import { allowedOverrides } from '../core/scheduler';
import { isPaused, pauseTimer, resumeTimer, startTimer, timeLeft, type Timer } from '../core/timer';
import { levelLabel, type Card, type DateStr, type Level, type Streak } from '../core/types';
import { useApp } from './AppContext';
import { BinPicker } from './components/BinPicker';
import { InlineText, QuestionText } from './components/QuestionText';

interface Run {
  sessionId: string;
  date: DateStr;
  cards: Map<string, Card>;
  current: QueueItem;
  remaining: QueueItem[];
  retried: Set<string>;
  options: string[]; // shuffled multiple-choice options for the current card
}

interface Summary {
  answered: number;
  firstAttempts: number;
  firstCorrect: number;
  completed: boolean;
  streak: Streak;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'answering' }
  | { kind: 'result'; pending: PendingReview; chosen: Level }
  | { kind: 'done'; summary: Summary };

function optionsFor(card: Card): string[] {
  return card.type === 'multiple' ? shuffle([...card.answers, ...card.distractors], Math.random) : [];
}

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Session({ onExit }: { onExit: () => void }) {
  const { repo, settings } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [run, setRun] = useState<Run | null>(null);
  const [typed, setTyped] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [timer, setTimer] = useState<Timer | null>(null);
  const [saving, setSaving] = useState(false);
  const counts = useRef({ answered: 0, firstAttempts: 0, firstCorrect: 0 });
  const started = useRef(false);

  // Start: roll over, snapshot the queue, open a session record.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await repo.runRollover();
      const date = await repo.today();
      const all = await repo.getAllCards();
      const queue = buildQueue(all, date, Math.random);
      if (queue.length === 0) {
        setPhase({ kind: 'empty' });
        return;
      }
      const session = await repo.startSession(date);
      const cards = new Map(all.map((c) => [c.id, c]));
      const [current, ...remaining] = queue;
      setRun({
        sessionId: session.id,
        date,
        cards,
        current,
        remaining,
        retried: new Set(),
        options: optionsFor(cards.get(current.cardId)!),
      });
      setTimer(startTimer(settings.sessionMinutes * 60_000, Date.now()));
      setPhase({ kind: 'answering' });
    })();
  }, [repo, settings.sessionMinutes]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const card = run ? run.cards.get(run.current.cardId)! : null;
  const remainingMs = timer ? timeLeft(timer, now) : 0;
  const timeUp = timer !== null && remainingMs <= 0;
  const paused = timer !== null && isPaused(timer);

  function submit(response: string[]) {
    if (!run || !card || phase.kind !== 'answering') return;
    const pending = evaluate(card, response, run.current.isRetry, settings);
    if (settings.pauseTimerOnResult && timer) setTimer(pauseTimer(timer, Date.now()));
    setPhase({ kind: 'result', pending, chosen: pending.autoLevel });
  }

  /** Manual pause on the answer screen: only for this card, Continue always resumes. */
  function togglePause() {
    if (!timer || phase.kind !== 'result' || settings.pauseTimerOnResult || timeUp) return;
    const t = Date.now();
    setTimer(isPaused(timer) ? resumeTimer(timer, t) : pauseTimer(timer, t));
    setNow(t);
  }

  async function finish(completed: boolean) {
    if (!run) return;
    const meta = await repo.endSession(run.sessionId, completed);
    setPhase({ kind: 'done', summary: { ...counts.current, completed, streak: meta.streak } });
  }

  /** Persist the shown result. Returns the run state after it (with a retry queued if needed). */
  async function persist(pending: PendingReview, chosen: Level): Promise<Run> {
    const r = run!;
    const { card: updated, log } = commit(pending, chosen, r.date, new Date().toISOString(), { logId: '', sessionId: r.sessionId }, settings);
    await repo.commitAnswer(updated, log);
    counts.current.answered++;
    if (!pending.isRetry) {
      counts.current.firstAttempts++;
      if (pending.correct) counts.current.firstCorrect++;
    }
    const cards = new Map(r.cards).set(updated.id, updated);
    let remaining = r.remaining;
    const retried = new Set(r.retried);
    if (!pending.correct && !pending.isRetry && !retried.has(updated.id)) {
      remaining = insertRetry(remaining, updated.id, r.date, Math.random);
      retried.add(updated.id);
    }
    return { ...r, cards, remaining, retried };
  }

  async function onContinue() {
    if (phase.kind !== 'result' || saving || !run) return;
    setSaving(true);
    try {
      const next = await persist(phase.pending, phase.chosen);
      const t = Date.now();
      if (!timer || timeLeft(timer, t) <= 0 || next.remaining.length === 0) {
        setRun(next);
        await finish(true);
        return;
      }
      setTimer(resumeTimer(timer, t));
      setNow(t);
      const [current, ...remaining] = next.remaining;
      setRun({ ...next, current, remaining, options: optionsFor(next.cards.get(current.cardId)!) });
      setTyped('');
      setSelected([]);
      setPhase({ kind: 'answering' });
    } finally {
      setSaving(false);
    }
  }

  async function onQuit() {
    if (saving || !run) return;
    if (!confirm('End the session early? Answers so far are saved, but the session will not count toward your streak.')) return;
    setSaving(true);
    try {
      if (phase.kind === 'result') await persist(phase.pending, phase.chosen);
      await finish(false);
    } finally {
      setSaving(false);
    }
  }

  // Keyboard: Enter submits/continues, T/F for true-false, digits for options and bins.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const typing = target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type === 'text');
      if (typing) return;
      if (!card) return;

      if (phase.kind === 'result') {
        if (e.key === 'Enter') {
          e.preventDefault();
          void onContinue();
        } else if (e.key === 'p' || e.key === 'P') {
          togglePause();
        } else if (/^[1-7]$/.test(e.key) && !phase.pending.isRetry) {
          const l = Number(e.key) as Level;
          if (allowedOverrides(card.level).includes(l)) setPhase({ ...phase, chosen: l });
        }
        return;
      }
      if (phase.kind !== 'answering') return;
      if (card.type === 'truefalse') {
        if (e.key === 't' || e.key === '1') submit(['true']);
        if (e.key === 'f' || e.key === '2') submit(['false']);
      } else if (card.type === 'multiple' && run) {
        if (/^[1-9]$/.test(e.key)) {
          const opt = run.options[Number(e.key) - 1];
          if (opt !== undefined) setSelected((s) => (s.includes(opt) ? s.filter((x) => x !== opt) : [...s, opt]));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          submit(selected);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase.kind === 'loading') return <p className="muted">Preparing session…</p>;

  if (phase.kind === 'empty') {
    return (
      <div className="panel stack">
        <h2>Nothing due</h2>
        <p className="muted">There are no cards due right now.</p>
        <button onClick={onExit}>Back</button>
      </div>
    );
  }

  if (phase.kind === 'done') {
    const s = phase.summary;
    return (
      <div className="panel stack">
        <h2>{s.completed ? 'Session complete' : 'Session ended early'}</h2>
        <div className="grid">
          <div className="stat"><span className="value">{s.answered}</span><span className="label">answers</span></div>
          <div className="stat">
            <span className="value">{s.firstAttempts ? `${Math.round((100 * s.firstCorrect) / s.firstAttempts)}%` : '–'}</span>
            <span className="label">first-attempt accuracy</span>
          </div>
          <div className="stat"><span className="value">{s.streak.current}</span><span className="label">day streak</span></div>
        </div>
        {!s.completed && <p className="small muted">Your answers were saved. Quitting early doesn't count toward the streak.</p>}
        <div><button className="primary" onClick={onExit}>Done</button></div>
      </div>
    );
  }

  if (!run || !card) return null;
  const left = run.remaining.length + 1;
  const isRetry = run.current.isRetry;

  return (
    <div>
      <div className="session-head">
        <span className={`timer ${timeUp ? 'up' : ''} ${paused && !timeUp ? 'paused' : ''}`}>
          {timeUp ? "Time's up — finish this card" : `${paused ? '⏸ ' : ''}${formatClock(remainingMs)}${paused ? ' paused' : ''}`}
        </span>
        <span className="progress">{left} card{left === 1 ? '' : 's'} left</span>
        <span className="spacer" />
        <button onClick={onQuit} disabled={saving}>Quit</button>
      </div>

      <div className={`panel card-face ${phase.kind === 'answering' ? 'answering' : ''}`}>
        <div className="row small">
          <span className="pill">{levelLabel(card.level)}</span>
          {isRetry && <span className="pill">Retry · practice only</span>}
          {card.type === 'multiple' && <span className="muted">Select all that apply</span>}
        </div>
        <QuestionText text={card.question} />

        {phase.kind === 'answering' && card.type === 'written' && (
          <form onSubmit={(e) => { e.preventDefault(); submit([typed]); }} className="row">
            <input
              className="answer-input"
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="Your answer"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="primary" type="submit">Check <kbd>↵</kbd></button>
          </form>
        )}

        {phase.kind === 'answering' && card.type === 'truefalse' && (
          <div className="tf-buttons">
            <button onClick={() => submit(['true'])}>True <kbd>T</kbd></button>
            <button onClick={() => submit(['false'])}>False <kbd>F</kbd></button>
          </div>
        )}

        {phase.kind === 'answering' && card.type === 'multiple' && (
          <>
            <div className="options">
              {run.options.map((o, i) => (
                <label key={o} className={`option ${selected.includes(o) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(o)}
                    onChange={() => setSelected((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))}
                  />
                  <span>{o}</span>
                  <kbd className="tag">{i + 1}</kbd>
                </label>
              ))}
            </div>
            <div><button className="primary" onClick={() => submit(selected)}>Check <kbd>↵</kbd></button></div>
          </>
        )}

        {phase.kind === 'result' && (
          <Result card={card} pending={phase.pending} options={run.options} />
        )}
      </div>

      {phase.kind === 'result' && (
        <div className="panel result-actions">
          <div className="result-bins">
            {isRetry ? (
              <p className="small muted" style={{ margin: 0 }}>Retries are practice only: the card stays in {levelLabel(card.level)}.</p>
            ) : (
              <BinPicker
                levelBefore={card.level}
                autoLevel={phase.pending.autoLevel}
                chosen={phase.chosen}
                settings={settings}
                onChoose={(l) => setPhase({ ...phase, chosen: l })}
              />
            )}
          </div>
          <div className="result-buttons">
            {settings.pauseTimerOnResult ? (
              <span className="small muted">Timer paused while you read</span>
            ) : (
              <button onClick={togglePause} disabled={timeUp} aria-pressed={paused}>
                {paused ? 'Resume timer' : 'Pause timer'} <kbd>P</kbd>
              </button>
            )}
            <button className="primary" onClick={onContinue} disabled={saving} autoFocus>
              {timeUp || run.remaining.length === 0 ? 'Finish session' : 'Continue'} <kbd>↵</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Result({ card, pending, options }: { card: Card; pending: PendingReview; options: string[] }) {
  const verdict = (
    <span className={`verdict ${pending.correct ? 'good' : 'bad'}`}>{pending.correct ? 'Correct' : 'Incorrect'}</span>
  );
  const explanation = card.explanation && (
    <p className="explanation"><InlineText text={card.explanation} /></p>
  );

  if (card.type === 'written') {
    const [shown, ...alsoAccepted] = card.answers;
    return (
      <div className="result">
        <div className="result-line">
          {verdict}
          <span className="muted">You answered</span>
          <strong>{pending.response[0]?.trim() || <span className="muted">(nothing)</span>}</strong>
        </div>
        <div>
          Answer: <strong>{shown}</strong>
          {alsoAccepted.length > 0 && <span className="small muted"> · also accepted: {alsoAccepted.join(' · ')}</span>}
        </div>
        {explanation}
      </div>
    );
  }

  if (card.type === 'truefalse') {
    return (
      <div className="result">
        <div className="result-line">
          {verdict}
          <span>The statement is <strong>{card.answers[0] === 'true' ? 'true' : 'false'}</strong>.</span>
        </div>
        {explanation}
      </div>
    );
  }

  const b = multipleBreakdown(card.answers, pending.response);
  return (
    <div className="result">
      {verdict}
      <div className="options compact">
        {options.map((o) => {
          const cls = b.selectedCorrect.includes(o) ? 'good' : b.wronglySelected.includes(o) ? 'bad' : b.missed.includes(o) ? 'missed' : '';
          const tag = b.selectedCorrect.includes(o) ? 'correct' : b.wronglySelected.includes(o) ? 'wrongly selected' : b.missed.includes(o) ? 'missed' : '';
          return (
            <div key={o} className={`option ${cls}`}>
              <span>{o}</span>
              {tag && <span className="tag">{tag}</span>}
            </div>
          );
        })}
      </div>
      {explanation}
    </div>
  );
}

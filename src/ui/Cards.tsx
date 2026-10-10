import { useMemo, useState } from 'react';
import { validateCardFields } from '../core/import/validate';
import { normalizeQuestion } from '../core/normalize';
import { CARD_TYPES, levelLabel, type Card, type CardType, type Level } from '../core/types';
import { useApp } from './AppContext';
import { questionPreview, useLoad } from './util';

type Editing = { mode: 'new' } | { mode: 'edit'; card: Card };

export function Cards() {
  const { repo, version, refresh } = useApp();
  const cards = useLoad(() => repo.getAllCards(), [repo, version]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<CardType | 'all'>('all');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [editing, setEditing] = useState<Editing | null>(null);

  const shown = useMemo(() => {
    if (!cards) return [];
    const q = normalizeQuestion(query);
    return cards
      .filter((c) => type === 'all' || c.type === type)
      .filter((c) => level === 'all' || c.level === level)
      .filter((c) => !q || normalizeQuestion(`${c.question} ${c.answers.join(' ')} ${c.distractors.join(' ')}`).includes(q))
      .sort((a, b) => a.level - b.level || (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.importOrder - b.importOrder);
  }, [cards, query, type, level]);

  if (!cards) return null;

  return (
    <>
      <div className="panel stack">
        <div className="row">
          <h2 style={{ margin: 0 }}>Cards</h2>
          <span className="muted">{shown.length} of {cards.length}</span>
          <span className="spacer" />
          <button className="primary" onClick={() => setEditing({ mode: 'new' })}>Add card</button>
        </div>
        <div className="row">
          <input type="search" placeholder="Search questions and answers" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <select value={type} onChange={(e) => setType(e.target.value as CardType | 'all')}>
            <option value="all">All types</option>
            {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value === 'all' ? 'all' : (Number(e.target.value) as Level))}>
            <option value="all">All levels</option>
            {([0, 1, 2, 3, 4, 5, 6, 7] as Level[]).map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
          </select>
        </div>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Question</th><th>Type</th><th>Level</th><th>Due</th></tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => setEditing({ mode: 'edit', card: c })}>
                <td>{questionPreview(c.question)}</td>
                <td><span className="pill">{c.type}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>{levelLabel(c.level)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.dueDate ?? '–'}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={4} className="muted">No cards match.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <CardEditor
          editing={editing}
          allCards={cards}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refresh(); }}
        />
      )}
    </>
  );
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

function CardEditor({ editing, allCards, onClose, onSaved }: { editing: Editing; allCards: Card[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const { repo } = useApp();
  const initial = editing.mode === 'edit' ? editing.card : null;
  const [type, setType] = useState<CardType>(initial?.type ?? 'written');
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answers, setAnswers] = useState(initial && initial.type !== 'truefalse' ? initial.answers.join('\n') : '');
  const [tf, setTf] = useState(initial?.type === 'truefalse' ? initial.answers[0] : 'true');
  const [distractors, setDistractors] = useState(initial?.distractors.join('\n') ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function save() {
    const content = {
      type,
      question: question.trim(),
      answers: type === 'truefalse' ? [tf] : lines(answers),
      distractors: type === 'multiple' ? lines(distractors) : [],
    };
    const errs = validateCardFields(content);
    const key = normalizeQuestion(content.question);
    if (allCards.some((c) => c.id !== initial?.id && normalizeQuestion(c.question) === key)) {
      errs.push('Another card already has this question.');
    }
    setErrors(errs);
    if (errs.length) return;
    setBusy(true);
    try {
      if (initial) await repo.updateCardContent(initial.id, content);
      else await repo.addCards([content]);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !confirm('Delete this card? Its review history stays in the stats.')) return;
    await repo.deleteCard(initial.id);
    await onSaved();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal stack" role="dialog" aria-label={initial ? 'Edit card' : 'New card'}>
        <h2>{initial ? 'Edit card' : 'New card'}</h2>
        {initial && (
          <p className="small muted">
            {levelLabel(initial.level)} · due {initial.dueDate ?? 'when released from limbo'} · last reviewed {initial.lastReviewedDate ?? 'never'}.
            Editing doesn't change scheduling.
          </p>
        )}
        {!initial && <p className="small muted">New cards go to the end of limbo.</p>}
        <label className="field">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as CardType)}>
            {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          Question <span className="muted small">(plain text; fenced ``` code blocks allowed)</span>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={5} style={{ fontFamily: 'inherit' }} />
        </label>
        {type === 'truefalse' && (
          <div className="row">
            <label className="check"><input type="radio" checked={tf === 'true'} onChange={() => setTf('true')} /> True</label>
            <label className="check"><input type="radio" checked={tf === 'false'} onChange={() => setTf('false')} /> False</label>
          </div>
        )}
        {type !== 'truefalse' && (
          <label className="field">
            {type === 'written' ? 'Accepted answers, one per line (the first is shown after answering)' : 'Correct options, one per line'}
            <textarea value={answers} onChange={(e) => setAnswers(e.target.value)} rows={3} />
          </label>
        )}
        {type === 'multiple' && (
          <label className="field">
            Wrong options, one per line
            <textarea value={distractors} onChange={(e) => setDistractors(e.target.value)} rows={3} />
          </label>
        )}
        {errors.length > 0 && <div className="banner bad">{errors.map((e) => <div key={e}>{e}</div>)}</div>}
        <div className="row">
          {initial && <button className="danger" onClick={remove}>Delete</button>}
          <span className="spacer" />
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={busy}>Save</button>
        </div>
      </div>
    </div>
  );
}

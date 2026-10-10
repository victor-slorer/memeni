import { useState } from 'react';
import { parseCsv } from '../core/import/csv';
import { parseMarkdown } from '../core/import/markdown';
import { EXAMPLE_CSV, EXAMPLE_MD, SCHEMA_DOC } from '../core/import/schema';
import type { ValidationResult } from '../core/import/types';
import { validateImport } from '../core/import/validate';
import { useApp } from './AppContext';
import { downloadText, questionPreview } from './util';

interface Loaded {
  fileName: string;
  result: ValidationResult;
}

export function Import() {
  const { repo, refresh, settings } = useApp();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [over, setOver] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function readFile(file: File) {
    setDone(null);
    setFileError(null);
    setLoaded(null);
    const name = file.name.toLowerCase();
    const text = await file.text();
    let parsed;
    if (name.endsWith('.csv')) parsed = parseCsv(text);
    else if (name.endsWith('.md') || name.endsWith('.markdown')) parsed = parseMarkdown(text);
    else {
      setFileError('Choose a .csv or .md file.');
      return;
    }
    const result = validateImport(parsed.cards, await repo.existingQuestionKeys());
    result.errors.unshift(...parsed.errors);
    setLoaded({ fileName: file.name, result });
  }

  async function doImport() {
    if (!loaded) return;
    setBusy(true);
    try {
      const added = await repo.importCards(loaded.result.cards, { shuffle, skipDuplicates });
      await refresh(); // releases today's batch if it hasn't happened yet
      setDone(`${added.length} card${added.length === 1 ? '' : 's'} added to limbo from ${loaded.fileName}. They're released ${settings.newCardsPerDay} per day.`);
      setLoaded(null);
    } finally {
      setBusy(false);
    }
  }

  const r = loaded?.result;
  const blocked = !!r && r.errors.length > 0;
  const toImport = r ? (skipDuplicates ? r.cards.filter((c) => !c.duplicateOfExisting) : r.cards) : [];

  return (
    <>
      <div className="panel stack">
        <h2>Import cards</h2>
        <p className="muted">
          CSV suits bulk data, Markdown suits code snippets. Files must follow schema version 1 exactly. Nothing is
          imported unless the whole file is valid.
        </p>
        <div className="row">
          <button onClick={() => downloadText('memeni-schema.md', SCHEMA_DOC, 'text/markdown')}>Download schema</button>
          <button onClick={() => downloadText('example.csv', EXAMPLE_CSV, 'text/csv')}>Example .csv</button>
          <button onClick={() => downloadText('example.md', EXAMPLE_MD, 'text/markdown')}>Example .md</button>
        </div>
        <label
          className={`dropzone ${over ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void readFile(f);
          }}
        >
          Drop a .csv or .md file here, or click to choose one
          <input
            type="file"
            accept=".csv,.md,.markdown"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = '';
            }}
          />
        </label>
        {fileError && <div className="banner bad">{fileError}</div>}
        {done && <div className="banner good">{done}</div>}
      </div>

      {r && blocked && (
        <div className="panel stack">
          <h3>{loaded.fileName}: {r.errors.length} error{r.errors.length === 1 ? '' : 's'}, nothing imported</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Where</th><th>Problem</th></tr></thead>
              <tbody>
                {r.errors.map((e, i) => (
                  <tr key={i}><td style={{ whiteSpace: 'nowrap' }}>{e.location}</td><td>{e.message}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {r && !blocked && (
        <div className="panel stack">
          <div className="row">
            <h3 style={{ margin: 0 }}>Preview: {loaded.fileName}</h3>
            <span className="spacer" />
            <span className="muted small">{toImport.length} of {r.cards.length} cards will be imported</span>
          </div>
          {r.warnings.length > 0 && (
            <div className="banner warn">
              {r.warnings.length} question{r.warnings.length === 1 ? '' : 's'} already exist in your deck
              ({r.warnings.map((w) => w.location).join(', ')}).
            </div>
          )}
          <div className="row">
            <label className="check">
              <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
              Shuffle release order (default: file order)
            </label>
            {r.warnings.length > 0 && (
              <label className="check">
                <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                Skip duplicates
              </label>
            )}
            <span className="spacer" />
            <button onClick={() => setLoaded(null)}>Cancel</button>
            <button className="primary" disabled={busy || toImport.length === 0} onClick={doImport}>
              Import {toImport.length} card{toImport.length === 1 ? '' : 's'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Where</th><th>Type</th><th>Question</th><th>Answers</th><th>Wrong options</th></tr></thead>
              <tbody>
                {r.cards.map((c) => (
                  <tr key={c.location} style={c.duplicateOfExisting && skipDuplicates ? { opacity: 0.45 } : undefined}>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.location}</td>
                    <td><span className="pill">{c.type}</span></td>
                    <td>{questionPreview(c.question)}</td>
                    <td>{c.answers.join(' · ')}</td>
                    <td>{c.distractors.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

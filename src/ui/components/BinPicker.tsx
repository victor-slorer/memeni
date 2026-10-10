import { allowedOverrides, intervalFor } from '../../core/scheduler';
import { GRADUATED, levelLabel, type Level, type Settings } from '../../core/types';

const ALL: Level[] = [1, 2, 3, 4, 5, 6, 7];

interface Props {
  levelBefore: Level;
  autoLevel: Level;
  chosen: Level;
  settings: Settings;
  onChoose: (level: Level) => void;
}

/** Destination bins 1-6 plus Graduated; only 1..min(level + 1, 7) are selectable. */
export function BinPicker({ levelBefore, autoLevel, chosen, settings, onChoose }: Props) {
  const allowed = new Set(allowedOverrides(levelBefore));
  const days = intervalFor(chosen, settings);
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Moves to <strong style={{ color: 'var(--text)' }}>{levelLabel(chosen)}</strong>, due in {days} day{days === 1 ? '' : 's'}.
        {chosen !== autoLevel && ` (default was ${levelLabel(autoLevel)})`}
      </p>
      <div className="bins" role="radiogroup" aria-label="Destination bin">
        {ALL.map((l) => (
          <button
            key={l}
            role="radio"
            aria-checked={l === chosen}
            className={`bin ${l === chosen ? 'chosen' : ''} ${l === autoLevel ? 'auto' : ''}`}
            disabled={!allowed.has(l)}
            onClick={() => onChoose(l)}
            title={`${levelLabel(l)} — press ${l}`}
          >
            {l === GRADUATED ? 'G' : l}
          </button>
        ))}
      </div>
    </div>
  );
}

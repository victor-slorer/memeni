import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { computeStats } from '../core/stats';
import { levelLabel, type Level } from '../core/types';
import { useApp } from './AppContext';
import { percent, useLoad } from './util';

const axis = { stroke: 'var(--muted)', fontSize: 12 };
const tooltip = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' },
  labelStyle: { color: 'var(--muted)' },
};

export function Stats() {
  const { repo, version } = useApp();
  const data = useLoad(async () => {
    const [cards, log] = await Promise.all([repo.getAllCards(), repo.getReviewLog()]);
    return computeStats(cards, log);
  }, [repo, version]);
  if (!data) return null;

  const days = data.days.slice(-60).map((d) => ({
    date: d.date.slice(5),
    accuracy: d.accuracy === null ? null : Math.round(d.accuracy * 100),
    firstAttempts: d.firstAttempts,
    retries: d.reviews - d.firstAttempts,
  }));
  const levels = ([1, 2, 3, 4, 5, 6, 7] as Level[]).map((l) => ({ level: l === 7 ? 'G' : String(l), name: levelLabel(l), cards: data.perLevel[l] }));
  const totalReviews = data.days.reduce((n, d) => n + d.reviews, 0);

  return (
    <>
      <div className="grid">
        <div className="panel stat"><span className="value">{percent(data.overallAccuracy)}</span><span className="label">first-attempt accuracy</span></div>
        <div className="panel stat"><span className="value">{totalReviews}</span><span className="label">answers ({data.totalFirstAttempts} first attempts)</span></div>
        <div className="panel stat"><span className="value">{data.days.length}</span><span className="label">days reviewed</span></div>
        <div className="panel stat">
          <span className="value">{data.overrides.total}</span>
          <span className="label">bin overrides</span>
          <span className="small muted">{data.overrides.up} up · {data.overrides.down} down</span>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="panel muted">No reviews yet. Stats appear after your first session.</div>
      ) : (
        <>
          <div className="panel">
            <h3>Accuracy per day <span className="muted small">(first attempts, last 60 days)</span></h3>
            <LineChart className="chart" style={{ width: '100%', height: 220 }} responsive data={days} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={axis} stroke="var(--border)" />
              <YAxis domain={[0, 100]} unit="%" tick={axis} stroke="var(--border)" />
              <Tooltip {...tooltip} formatter={(v) => [`${String(v)}%`, 'Accuracy']} />
              <Line type="monotone" dataKey="accuracy" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </div>
          <div className="panel">
            <h3>Answers per day</h3>
            <BarChart style={{ width: '100%', height: 220 }} responsive data={days} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={axis} stroke="var(--border)" />
              <YAxis allowDecimals={false} tick={axis} stroke="var(--border)" />
              <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar maxBarSize={48} dataKey="firstAttempts" name="First attempts" stackId="a" fill="var(--accent)" />
              <Bar maxBarSize={48} dataKey="retries" name="Retries" stackId="a" fill="color-mix(in srgb, var(--accent) 40%, transparent)" />
            </BarChart>
          </div>
        </>
      )}

      <div className="panel">
        <h3>Cards per level <span className="muted small">({data.perLevel[0]} in limbo, not shown)</span></h3>
        <BarChart style={{ width: '100%', height: 220 }} responsive data={levels} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="level" tick={axis} stroke="var(--border)" />
          <YAxis allowDecimals={false} tick={axis} stroke="var(--border)" />
          <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-2)' }} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''} />
          <Bar maxBarSize={64} dataKey="cards" name="Cards" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </div>
    </>
  );
}

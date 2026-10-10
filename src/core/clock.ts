import type { DateStr } from './types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateStr(s: unknown): s is DateStr {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The local calendar date of `now`. */
export function localDateStr(now: Date): DateStr {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The single source of "today": honours the debug override. */
export function today(debugTodayOverride: DateStr | null, now: Date = new Date()): DateStr {
  return debugTodayOverride ?? localDateStr(now);
}

// Date arithmetic works on the date's components in UTC, so DST shifts in the
// local zone can never add or lose a day.
function toUtcMs(d: DateStr): number {
  const m = DATE_RE.exec(d);
  if (!m) throw new Error(`Invalid date: ${d}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

function fromUtcMs(ms: number): DateStr {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const DAY_MS = 86_400_000;

export function addDays(d: DateStr, days: number): DateStr {
  return fromUtcMs(toUtcMs(d) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

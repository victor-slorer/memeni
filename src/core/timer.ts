/** A pausable countdown. `now` is passed in (epoch ms) so it stays pure and testable. */
export interface Timer {
  remainingMs: number; // as of `runningSince`, or frozen while paused
  runningSince: number | null; // null while paused
}

export function startTimer(durationMs: number, now: number): Timer {
  return { remainingMs: durationMs, runningSince: now };
}

export function timeLeft(t: Timer, now: number): number {
  if (t.runningSince === null) return t.remainingMs;
  return Math.max(0, t.remainingMs - (now - t.runningSince));
}

export function isPaused(t: Timer): boolean {
  return t.runningSince === null;
}

export function pauseTimer(t: Timer, now: number): Timer {
  return isPaused(t) ? t : { remainingMs: timeLeft(t, now), runningSince: null };
}

export function resumeTimer(t: Timer, now: number): Timer {
  return isPaused(t) ? { ...t, runningSince: now } : t;
}

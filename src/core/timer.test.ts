import { describe, expect, it } from 'vitest';
import { isPaused, pauseTimer, resumeTimer, startTimer, timeLeft } from './timer';

describe('timer', () => {
  it('counts down while running and stops at zero', () => {
    const t = startTimer(60_000, 1_000);
    expect(timeLeft(t, 1_000)).toBe(60_000);
    expect(timeLeft(t, 31_000)).toBe(30_000);
    expect(timeLeft(t, 999_999)).toBe(0);
  });

  it('freezes while paused and continues from the same point after resuming', () => {
    let t = startTimer(60_000, 0);
    t = pauseTimer(t, 10_000);
    expect(isPaused(t)).toBe(true);
    expect(timeLeft(t, 500_000)).toBe(50_000); // a long pause costs nothing
    t = resumeTimer(t, 500_000);
    expect(timeLeft(t, 520_000)).toBe(30_000);
  });

  it('ignores a pause while paused and a resume while running', () => {
    const paused = pauseTimer(startTimer(60_000, 0), 10_000);
    expect(pauseTimer(paused, 20_000)).toBe(paused);
    const running = startTimer(60_000, 0);
    expect(resumeTimer(running, 5_000)).toBe(running);
  });
});

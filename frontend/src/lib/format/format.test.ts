import {
  countdownTo,
  formatDelta,
  formatPercent,
  formatPoints,
  formatPrice,
  formatRank,
  formatRelativeTime,
} from './index';

describe('format', () => {
  it('formats prices and points', () => {
    expect(formatPrice(7.45)).toBe('£7.5m');
    expect(formatPoints(6.04)).toBe('6.0');
    expect(formatPercent(12.345)).toBe('12.3%');
  });

  it('signs deltas with a true minus and no negative zero', () => {
    expect(formatDelta(2.34)).toBe('+2.3');
    expect(formatDelta(-1)).toBe('−1.0');
    expect(formatDelta(-0.01)).toBe('0.0');
  });

  it('compacts ranks', () => {
    expect(formatRank(1_234_567)).toBe('1.2M');
    expect(formatRank(null)).toBe('—');
  });

  it('formats relative time', () => {
    const now = new Date('2026-10-30T12:00:00Z');
    expect(formatRelativeTime(new Date('2026-10-30T10:00:00Z'), now)).toBe('2 hours ago');
    expect(formatRelativeTime(new Date('2026-11-01T12:00:00Z'), now)).toBe('in 2 days');
    expect(formatRelativeTime(now, now)).toBe('just now');
  });

  it('counts down and clamps at zero', () => {
    const now = new Date('2026-10-30T12:00:00Z');
    expect(countdownTo(new Date('2026-10-31T13:02:03Z'), now)).toEqual({
      days: 1,
      hours: 1,
      minutes: 2,
      seconds: 3,
      passed: false,
    });
    expect(countdownTo(new Date('2026-10-29T00:00:00Z'), now).passed).toBe(true);
  });
});

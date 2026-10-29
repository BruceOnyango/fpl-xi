/** Pure display formatters. No React, no data fetching — unit-tested in format.test.ts. */

/** 7.5 → "£7.5m" */
export function formatPrice(millions: number): string {
  return `£${millions.toFixed(1)}m`;
}

/** 6.04 → "6.0" (predictions are estimates; one decimal is already generous). */
export function formatPoints(points: number): string {
  return points.toFixed(1);
}

/** Signed delta: 2.34 → "+2.3", -1 → "−1.0", 0 → "0.0". Uses a true minus sign. */
export function formatDelta(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return (0).toFixed(digits);
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(digits)}`;
}

/** 12.345 → "12.3%" */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
const grouped = new Intl.NumberFormat('en-GB');

/** 1_234_567 → "1.2M"; null → "—" */
export function formatRank(rank: number | null): string {
  return rank === null ? '—' : compact.format(rank);
}

/** 1234567 → "1,234,567" */
export function formatInteger(value: number): string {
  return grouped.format(value);
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** Relative time from `now`: "2 hours ago", "in 3 days", "now". */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'just now';
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "Fri 30 Oct, 18:30" in the viewer's timezone. */
export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target has passed. */
  passed: boolean;
}

export function countdownTo(target: Date, now: Date = new Date()): Countdown {
  const ms = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
    passed: ms === 0,
  };
}

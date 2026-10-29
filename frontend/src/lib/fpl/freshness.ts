/**
 * How worried should a manager be about the age of this data? (PROMPT.md §8)
 *
 * Prices move daily and injury flags change hours before kickoff, so the bar
 * tightens as the deadline approaches.
 */
const HOUR = 3_600_000;

export type FreshnessLevel = 'ok' | 'warn' | 'stale';

export interface Freshness {
  level: FreshnessLevel;
  ageMs: number;
  /** Why it's not 'ok' — shown to the user. Null when ok. */
  reason: string | null;
}

export const FRESHNESS_RULES = {
  staleAfterMs: 48 * HOUR,
  warnAfterMs: 12 * HOUR,
  /** Within this window before the deadline… */
  deadlineWindowMs: 24 * HOUR,
  /** …data older than this is flagged. */
  nearDeadlineMaxAgeMs: 3 * HOUR,
} as const;

export function assessFreshness(
  dataFetchedAt: Date,
  now: Date,
  nextDeadline: Date | null = null,
): Freshness {
  const ageMs = Math.max(0, now.getTime() - dataFetchedAt.getTime());
  if (ageMs >= FRESHNESS_RULES.staleAfterMs) {
    return {
      level: 'stale',
      ageMs,
      reason: 'Prices and injury flags may have changed since this data was pulled.',
    };
  }
  if (nextDeadline) {
    const toDeadline = nextDeadline.getTime() - now.getTime();
    if (
      toDeadline > 0 &&
      toDeadline <= FRESHNESS_RULES.deadlineWindowMs &&
      ageMs >= FRESHNESS_RULES.nearDeadlineMaxAgeMs
    ) {
      return {
        level: 'warn',
        ageMs,
        reason: 'The deadline is close — late team news may not be reflected yet.',
      };
    }
    if (dataFetchedAt.getTime() < nextDeadline.getTime() - 7 * 24 * HOUR) {
      return {
        level: 'stale',
        ageMs,
        reason: 'This data predates the previous gameweek.',
      };
    }
  }
  if (ageMs >= FRESHNESS_RULES.warnAfterMs) {
    return { level: 'warn', ageMs, reason: 'Prices may have moved since this data was pulled.' };
  }
  return { level: 'ok', ageMs, reason: null };
}

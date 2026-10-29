/** Player-level helpers shared across features. Pure. */
import type { Player, PlayerStatus } from '@/lib/api/schemas';

export type Availability = 'available' | 'doubtful' | 'out';

/** Mirror of the backend's availability gate (scripts/predict_upcoming.py). */
export const OUT_STATUSES: ReadonlySet<PlayerStatus> = new Set(['i', 's', 'u', 'n']);

export function availabilityOf(p: Pick<Player, 'status' | 'chanceOfPlaying'>): Availability {
  if (OUT_STATUSES.has(p.status)) return 'out';
  if (p.status === 'd' || (p.chanceOfPlaying !== null && p.chanceOfPlaying < 100)) {
    return 'doubtful';
  }
  return 'available';
}

export const STATUS_LABEL: Record<PlayerStatus, string> = {
  a: 'Available',
  d: 'Doubtful',
  i: 'Injured',
  s: 'Suspended',
  u: 'Unavailable',
  n: 'Not in squad',
};

/** Players flagged in any way, most severe first. */
export function flaggedPlayers(players: readonly Player[]): Player[] {
  const rank: Record<Availability, number> = { out: 0, doubtful: 1, available: 2 };
  return players
    .filter((p) => availabilityOf(p) !== 'available')
    .sort(
      (a, b) =>
        rank[availabilityOf(a)] - rank[availabilityOf(b)] ||
        (a.chanceOfPlaying ?? 0) - (b.chanceOfPlaying ?? 0),
    );
}

/** Predicted points per £m — the "value" lens. */
export function valueScore(p: Pick<Player, 'prediction' | 'price'>): number {
  return p.price > 0 ? p.prediction.points / p.price : 0;
}

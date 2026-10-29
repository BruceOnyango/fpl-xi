/**
 * Best starting XI from a fixed 15-man squad.
 *
 * For a squad that is already legal (2/5/5/3, ≤3 per club) the club and budget
 * constraints can't bind, so the backend's ILP reduces to: pick the top GK, then
 * try every legal formation and take the top-n per position. That enumeration is
 * exact (there are only 7 formations), which is why the transfer planner can
 * re-solve live in the browser without a round-trip.
 */
import type { Position } from '@/lib/api/schemas';

export interface Candidate {
  id: number;
  position: Position;
  /** Score the XI is picked on (may be a multi-GW horizon sum). */
  predicted: number;
  /** Single-GW score used for captaincy; defaults to `predicted`. */
  captainScore?: number;
}

export interface SolvedLineup {
  formation: string;
  starters: Candidate[];
  /** Bench order: backup GK first, then outfield by predicted desc (FPL convention). */
  bench: Candidate[];
  captainId: number;
  viceCaptainId: number;
  /** Sum of starters' `predicted`, with the captain counted twice. */
  total: number;
}

/** DEF-MID-FWD counts FPL allows with exactly one GK. */
export const FORMATIONS: readonly [number, number, number][] = [
  [3, 4, 3],
  [3, 5, 2],
  [4, 3, 3],
  [4, 4, 2],
  [4, 5, 1],
  [5, 3, 2],
  [5, 4, 1],
];

const byPredictedDesc = (a: Candidate, b: Candidate) => b.predicted - a.predicted || a.id - b.id;
const captainScore = (c: Candidate) => c.captainScore ?? c.predicted;

export function solveLineup(squad: readonly Candidate[]): SolvedLineup {
  const pool = (pos: Position) => squad.filter((c) => c.position === pos).sort(byPredictedDesc);
  const gks = pool('GK');
  const defs = pool('DEF');
  const mids = pool('MID');
  const fwds = pool('FWD');
  const gk = gks[0];
  if (!gk) throw new Error('Squad has no goalkeeper');

  let best: { starters: Candidate[]; formation: string; score: number } | null = null;
  for (const [d, m, f] of FORMATIONS) {
    if (defs.length < d || mids.length < m || fwds.length < f) continue;
    const starters = [gk, ...defs.slice(0, d), ...mids.slice(0, m), ...fwds.slice(0, f)];
    const score = starters.reduce((s, c) => s + c.predicted, 0);
    if (!best || score > best.score + 1e-9) best = { starters, formation: `${d}-${m}-${f}`, score };
  }
  if (!best) throw new Error('Squad cannot field a legal formation');

  const starterIds = new Set(best.starters.map((c) => c.id));
  const benchGk = gks.filter((c) => !starterIds.has(c.id));
  const benchOutfield = squad
    .filter((c) => c.position !== 'GK' && !starterIds.has(c.id))
    .sort(byPredictedDesc);

  const byCaptain = [...best.starters].sort(
    (a, b) => captainScore(b) - captainScore(a) || a.id - b.id,
  );
  const captain = byCaptain[0];
  const vice = byCaptain[1];
  if (!captain || !vice) throw new Error('Lineup too small to name a captain');

  return {
    formation: best.formation,
    starters: best.starters,
    bench: [...benchGk, ...benchOutfield],
    captainId: captain.id,
    viceCaptainId: vice.id,
    total: best.score + captain.predicted,
  };
}

/** Group starters into pitch rows, GK first. */
export function pitchRows<T extends { position: Position }>(starters: readonly T[]): T[][] {
  const order: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
  return order.map((pos) => starters.filter((s) => s.position === pos));
}

/**
 * FPL squad rules and transfer simulation — pure, so the planner can enforce
 * them live as the user types (PROMPT.md §11.3). The backend stays authoritative;
 * this is instant feedback, not the final word.
 */
import type { Player, Position } from '@/lib/api/schemas';

export const SQUAD_SHAPE: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
export const MAX_PER_CLUB = 3;
export const HIT_COST = 4;

export type Violation =
  | { kind: 'budget'; overBy: number }
  | { kind: 'club-limit'; teamId: number; count: number }
  | { kind: 'position-count'; position: Position; count: number; required: number }
  | { kind: 'duplicate'; playerId: number };

export function validateSquad(players: readonly Player[], bank: number): Violation[] {
  const violations: Violation[] = [];
  if (bank < -1e-9) violations.push({ kind: 'budget', overBy: Number((-bank).toFixed(1)) });

  const seen = new Set<number>();
  for (const p of players) {
    if (seen.has(p.id)) violations.push({ kind: 'duplicate', playerId: p.id });
    seen.add(p.id);
  }

  const perClub = new Map<number, number>();
  for (const p of players) perClub.set(p.teamId, (perClub.get(p.teamId) ?? 0) + 1);
  for (const [teamId, count] of perClub) {
    if (count > MAX_PER_CLUB) violations.push({ kind: 'club-limit', teamId, count });
  }

  for (const position of Object.keys(SQUAD_SHAPE) as Position[]) {
    const count = players.filter((p) => p.position === position).length;
    const required = SQUAD_SHAPE[position];
    if (count !== required) violations.push({ kind: 'position-count', position, count, required });
  }
  return violations;
}

export interface TransferPair {
  outId: number;
  inId: number;
}

export interface SimulationInput {
  squad: readonly Player[];
  /** playerId → £m the manager gets back on sale. */
  sellingPrices: ReadonlyMap<number, number>;
  bank: number;
  freeTransfers: number;
  transfers: readonly TransferPair[];
  players: ReadonlyMap<number, Player>;
}

export interface SimulationResult {
  squadAfter: Player[];
  bankAfter: number;
  hitCost: number;
  /** Σ predicted(in) − Σ predicted(out), before hits. */
  rawPointDelta: number;
  /** rawPointDelta − hitCost. The number to show a manager. */
  netPointDelta: number;
  violations: Violation[];
}

export function simulateTransfers(input: SimulationInput): SimulationResult {
  const outIds = new Set(input.transfers.map((t) => t.outId));
  const ins = input.transfers
    .map((t) => input.players.get(t.inId))
    .filter((p): p is Player => p !== undefined);
  const outs = input.squad.filter((p) => outIds.has(p.id));

  const squadAfter = [...input.squad.filter((p) => !outIds.has(p.id)), ...ins];
  const sold = outs.reduce((s, p) => s + (input.sellingPrices.get(p.id) ?? p.price), 0);
  const bought = ins.reduce((s, p) => s + p.price, 0);
  const bankAfter = Number((input.bank + sold - bought).toFixed(1));

  const extra = Math.max(0, input.transfers.length - input.freeTransfers);
  const hitCost = extra * HIT_COST;
  const rawPointDelta =
    ins.reduce((s, p) => s + p.prediction.points, 0) -
    outs.reduce((s, p) => s + p.prediction.points, 0);

  return {
    squadAfter,
    bankAfter,
    hitCost,
    rawPointDelta,
    netPointDelta: rawPointDelta - hitCost,
    violations: validateSquad(squadAfter, bankAfter),
  };
}

/** Human sentence for a violation; `teamName` resolves club ids. */
export function describeViolation(v: Violation, teamName: (id: number) => string): string {
  switch (v.kind) {
    case 'budget':
      return `Over budget by £${v.overBy.toFixed(1)}m.`;
    case 'club-limit':
      return `${v.count} players from ${teamName(v.teamId)} — the limit is ${MAX_PER_CLUB}.`;
    case 'position-count':
      return `${v.count} ${v.position} in the squad — you need exactly ${v.required}.`;
    case 'duplicate':
      return 'The same player is in the squad twice.';
  }
}

/** Planner state (URL-backed) + derived simulation. All maths lives in lib/fpl. */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlayerMap } from '@/lib/api/hooks';
import type { Horizon, Player } from '@/lib/api/schemas';
import type { SquadView } from '@/lib/api/views';
import { solveLineup } from '@/lib/fpl/lineup';
import { simulateTransfers, type SimulationResult, type TransferPair } from '@/lib/fpl/rules';
import { PARAM, parseTransfers, serializeTransfers } from './transferParams';

export interface TransferPlan {
  transfers: TransferPair[];
  pendingOutId: number | null;
  result: SimulationResult | null;
  /** Best-XI horizon points before and after the plan (exact, via solveLineup). */
  xiBefore: number | null;
  xiAfter: number | null;
  add: (pair: TransferPair) => void;
  remove: (outId: number) => void;
  reset: () => void;
  setPendingOut: (id: number | null) => void;
  /** Simulate a hypothetical extra move without committing it (for the picker). */
  preview: (pair: TransferPair) => SimulationResult | null;
  players: Map<number, Player>;
}

const xiPoints = (squad: readonly Player[]): number | null => {
  try {
    return solveLineup(
      squad.map((p) => ({ id: p.id, position: p.position, predicted: p.prediction.points })),
    ).total;
  } catch {
    return null;
  }
};

export function useTransferPlan(view: SquadView | null, horizon: Horizon): TransferPlan {
  const [params, setParams] = useSearchParams();
  const players = usePlayerMap(horizon);
  const transfers = useMemo(() => parseTransfers(params.get(PARAM)), [params]);
  const pendingRaw = params.get('sell');
  const pendingOutId = pendingRaw && /^\d+$/.test(pendingRaw) ? Number(pendingRaw) : null;

  const write = useCallback(
    (next: TransferPair[], pending: number | null) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.length) p.set(PARAM, serializeTransfers(next));
          else p.delete(PARAM);
          if (pending !== null) p.set('sell', String(pending));
          else p.delete('sell');
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );

  const simulate = useCallback(
    (pairs: readonly TransferPair[]) =>
      view && players.size
        ? simulateTransfers({
            squad: view.squad,
            sellingPrices: view.sellingPrices,
            bank: view.manager.bank,
            freeTransfers: view.manager.freeTransfers,
            transfers: pairs,
            players,
          })
        : null,
    [view, players],
  );

  // Ignore pairs whose out-player isn't in this squad (e.g. stale shared link).
  const valid = useMemo(
    () => transfers.filter((t) => view?.squad.some((p) => p.id === t.outId) && players.has(t.inId)),
    [transfers, view, players],
  );
  const result = useMemo(() => simulate(valid), [simulate, valid]);

  return {
    transfers: valid,
    pendingOutId,
    result,
    xiBefore: view ? xiPoints(view.squad) : null,
    xiAfter: result ? xiPoints(result.squadAfter) : null,
    add: (pair) => write([...valid.filter((t) => t.outId !== pair.outId), pair], null),
    remove: (outId) =>
      write(
        valid.filter((t) => t.outId !== outId),
        pendingOutId,
      ),
    reset: () => write([], null),
    setPendingOut: (id) => write(valid, id),
    preview: (pair) => simulate([...valid.filter((t) => t.outId !== pair.outId), pair]),
    players,
  };
}

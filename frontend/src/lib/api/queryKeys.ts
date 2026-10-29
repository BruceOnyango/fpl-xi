/** Every TanStack Query key in the app lives here, so invalidation is greppable. */
import type { Horizon } from './schemas';

export const queryKeys = {
  all: ['fpl'] as const,
  meta: () => [...queryKeys.all, 'meta'] as const,
  teams: () => [...queryKeys.all, 'teams'] as const,
  players: (horizon: Horizon) => [...queryKeys.all, 'players', { horizon }] as const,
  fixtures: (fromGw: number, toGw: number) =>
    [...queryKeys.all, 'fixtures', { fromGw, toGw }] as const,
  managerSquad: (teamId: number, horizon: Horizon) =>
    [...queryKeys.all, 'manager', teamId, 'squad', { horizon }] as const,
  leagues: (teamId: number) => [...queryKeys.all, 'manager', teamId, 'leagues'] as const,
  backtest: (horizon: Horizon) => [...queryKeys.all, 'backtest', { horizon }] as const,
};

const MINUTE = 60_000;
/**
 * Per-resource staleness. Predictions and squads move around the deadline (price
 * changes, injury news); team strength and backtests are effectively static.
 */
export const staleTimes = {
  meta: 5 * MINUTE,
  players: 10 * MINUTE,
  managerSquad: 10 * MINUTE,
  fixtures: 60 * MINUTE,
  leagues: 15 * MINUTE,
  teams: 24 * 60 * MINUTE,
  backtest: 24 * 60 * MINUTE,
} as const;

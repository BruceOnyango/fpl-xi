/**
 * Domain query hooks. Organisms and pages call these — never `fetch` or `api.*` directly.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './client';
import { queryKeys, staleTimes } from './queryKeys';
import type { Horizon, Player, Team } from './schemas';

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta(),
    queryFn: ({ signal }) => api.meta(signal),
    staleTime: staleTimes.meta,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams(),
    queryFn: ({ signal }) => api.teams(signal),
    staleTime: staleTimes.teams,
  });
}

/** id → Team lookup; empty map until teams load. */
export function useTeamMap(): Map<number, Team> {
  const { data } = useTeams();
  return useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);
}

export function usePlayerPredictions(horizon: Horizon) {
  return useQuery({
    queryKey: queryKeys.players(horizon),
    queryFn: ({ signal }) => api.players(horizon, signal),
    staleTime: staleTimes.players,
  });
}

/** id → Player lookup for a horizon; empty map until loaded. */
export function usePlayerMap(horizon: Horizon): Map<number, Player> {
  const { data } = usePlayerPredictions(horizon);
  return useMemo(() => new Map((data?.players ?? []).map((p) => [p.id, p])), [data]);
}

export function useFixtures(fromGw: number | undefined, toGw: number | undefined) {
  return useQuery({
    queryKey: queryKeys.fixtures(fromGw ?? 0, toGw ?? 0),
    queryFn: ({ signal }) => api.fixtures(fromGw ?? 0, toGw ?? 0, signal),
    staleTime: staleTimes.fixtures,
    enabled: fromGw !== undefined && toGw !== undefined,
  });
}

export function useManagerSquad(teamId: number | null, horizon: Horizon) {
  return useQuery({
    queryKey: queryKeys.managerSquad(teamId ?? 0, horizon),
    queryFn: ({ signal }) => api.managerSquad(teamId ?? 0, horizon, signal),
    staleTime: staleTimes.managerSquad,
    enabled: teamId !== null,
  });
}

export function useLeagues(teamId: number | null) {
  return useQuery({
    queryKey: queryKeys.leagues(teamId ?? 0),
    queryFn: ({ signal }) => api.leagues(teamId ?? 0, signal),
    staleTime: staleTimes.leagues,
    enabled: teamId !== null,
  });
}

export function useBacktest(horizon: Horizon) {
  return useQuery({
    queryKey: queryKeys.backtest(horizon),
    queryFn: ({ signal }) => api.backtest(horizon, signal),
    staleTime: staleTimes.backtest,
  });
}

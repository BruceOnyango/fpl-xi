/**
 * View-model hooks that join several resources (squad + predictions + teams + fixtures)
 * into what organisms render. Shared by Dashboard, My Team and Transfers, so it lives in
 * lib/ rather than inside one feature.
 */
import { useMemo } from 'react';
import { fixturesForTeam, type TeamFixture } from '@/lib/fpl/fixtures';
import { combineQueries } from './combine';
import { useFixtures, useManagerSquad, useMeta, usePlayerPredictions, useTeams } from './hooks';
import type { Horizon, Lineup, Manager, Player, Team } from './schemas';

/** How many gameweeks of fixtures the dashboard surfaces look ahead. */
export const LOOKAHEAD = 5;

export interface NextFixture {
  opponentShort: string;
  home: boolean;
  difficulty: TeamFixture['difficulty'];
}

export interface SlotView {
  player: Player;
  /** Prediction over the selected horizon. */
  predicted: number;
  teamShort: string;
  nextFixture: NextFixture | null;
}

export interface FixtureContext {
  teamShort: (teamId: number) => string;
  nextFixture: (teamId: number) => NextFixture | null;
  fixturesByTeam: Map<number, TeamFixture[]>;
}

/** Teams + fixture lookups for the next LOOKAHEAD gameweeks. */
export function useFixtureContext() {
  const meta = useMeta();
  const teams = useTeams();
  const nextGw = meta.data?.nextGw;
  const fixtures = useFixtures(nextGw, nextGw === undefined ? undefined : nextGw + LOOKAHEAD - 1);

  const value = useMemo<FixtureContext>(() => {
    const byId = new Map<number, Team>((teams.data?.teams ?? []).map((t) => [t.id, t]));
    const fixturesByTeam = new Map<number, TeamFixture[]>();
    for (const t of byId.values()) {
      fixturesByTeam.set(t.id, fixturesForTeam(fixtures.data?.fixtures ?? [], t.id));
    }
    const teamShort = (id: number) => byId.get(id)?.shortName ?? '—';
    return {
      teamShort,
      fixturesByTeam,
      nextFixture: (teamId) => {
        const f = fixturesByTeam.get(teamId)?.find((x) => x.gw === nextGw);
        return f
          ? { opponentShort: teamShort(f.opponentId), home: f.home, difficulty: f.difficulty }
          : null;
      },
    };
  }, [teams.data, fixtures.data, nextGw]);

  return { query: combineQueries(meta, teams, fixtures), meta: meta.data, context: value };
}

export interface SquadView {
  manager: Manager;
  lineup: Lineup;
  squad: Player[];
  sellingPrices: Map<number, number>;
  starters: SlotView[];
  bench: SlotView[];
  /** Single-GW predictions for the squad, for captaincy. */
  captainPool: { player: Player; teamShort: string; oneGw: Player['prediction'] }[];
  excludedReasons: Map<number, string>;
}

export function useSquadView(teamId: number | null, horizon: Horizon) {
  const squadQ = useManagerSquad(teamId, horizon);
  const playersQ = usePlayerPredictions(horizon);
  const oneGwQ = usePlayerPredictions(1);
  const fx = useFixtureContext();

  const view = useMemo<SquadView | null>(() => {
    if (!squadQ.data || !playersQ.data || !oneGwQ.data) return null;
    const byId = new Map(playersQ.data.players.map((p) => [p.id, p]));
    const oneGw = new Map(oneGwQ.data.players.map((p) => [p.id, p]));
    const { recommended } = squadQ.data;
    const toSlot = (slot: { playerId: number; predicted: number }): SlotView | null => {
      const player = byId.get(slot.playerId);
      if (!player) return null;
      return {
        player,
        predicted: slot.predicted,
        teamShort: fx.context.teamShort(player.teamId),
        nextFixture: fx.context.nextFixture(player.teamId),
      };
    };
    const squad = squadQ.data.squad
      .map((s) => byId.get(s.playerId))
      .filter((p): p is Player => p !== undefined);
    return {
      manager: squadQ.data.manager,
      lineup: recommended,
      squad,
      sellingPrices: new Map(squadQ.data.squad.map((s) => [s.playerId, s.sellingPrice])),
      starters: recommended.starters.map(toSlot).filter((s): s is SlotView => s !== null),
      bench: recommended.bench.map(toSlot).filter((s): s is SlotView => s !== null),
      captainPool: recommended.starters
        .map((s) => byId.get(s.playerId))
        .filter((p): p is Player => p !== undefined)
        .map((p) => ({
          player: p,
          teamShort: fx.context.teamShort(p.teamId),
          oneGw: oneGw.get(p.id)?.prediction ?? p.prediction,
        })),
      excludedReasons: new Map(recommended.excluded.map((e) => [e.playerId, e.reason])),
    };
  }, [squadQ.data, playersQ.data, oneGwQ.data, fx.context]);

  return {
    query: combineQueries(squadQ, playersQ, oneGwQ),
    fixturesQuery: fx.query,
    meta: fx.meta,
    fixtureContext: fx.context,
    view,
    raw: squadQ.data,
  };
}

/**
 * Realistic props for organism tests/stories, built from the seeded mock backend so
 * shapes always match the contract. Not for production code.
 */
import { db } from '@/mocks/db';
import type { Horizon, Player } from '@/lib/api/schemas';
import type { SlotView, SquadView } from '@/lib/api/views';
import { fixturesForTeam } from '@/lib/fpl/fixtures';

export const DEMO_TEAM = 8350133;

const teams = db.teams().teams;
const short = new Map(teams.map((t) => [t.id, t.shortName]));
export const teamShort = (id: number) => short.get(id) ?? '—';
export const allTeams = teams;

export function fixturesFrom(gw: number, span = 5) {
  return db.fixtures(gw, gw + span - 1).fixtures;
}

export function squadView(horizon: Horizon = 1, teamId = DEMO_TEAM): SquadView {
  const res = db.managerSquad(teamId, horizon);
  const players = new Map(db.players(horizon).players.map((p) => [p.id, p]));
  const oneGw = new Map(db.players(1).players.map((p) => [p.id, p]));
  const fx = fixturesFrom(res.recommended.gw, 1);
  const slot = (s: { playerId: number; predicted: number }): SlotView => {
    const player = players.get(s.playerId) as Player;
    const f = fixturesForTeam(fx, player.teamId)[0];
    return {
      player,
      predicted: s.predicted,
      teamShort: teamShort(player.teamId),
      nextFixture: f
        ? { opponentShort: teamShort(f.opponentId), home: f.home, difficulty: f.difficulty }
        : null,
    };
  };
  const squad = res.squad.map((s) => players.get(s.playerId) as Player);
  return {
    manager: res.manager,
    lineup: res.recommended,
    squad,
    sellingPrices: new Map(res.squad.map((s) => [s.playerId, s.sellingPrice])),
    starters: res.recommended.starters.map(slot),
    bench: res.recommended.bench.map(slot),
    captainPool: res.recommended.starters.map((s) => {
      const p = players.get(s.playerId) as Player;
      return {
        player: p,
        teamShort: teamShort(p.teamId),
        oneGw: oneGw.get(p.id)?.prediction ?? p.prediction,
      };
    }),
    excludedReasons: new Map(res.recommended.excluded.map((e) => [e.playerId, e.reason])),
  };
}

export function topPlayers(n = 20, horizon: Horizon = 1): Player[] {
  return [...db.players(horizon).players]
    .sort((a, b) => b.prediction.points - a.prediction.points)
    .slice(0, n);
}

export const league = () => db.leagues(DEMO_TEAM).leagues[0]!;

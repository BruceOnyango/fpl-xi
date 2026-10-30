/**
 * MOCK backend. Implements the API contract in lib/api/schemas.ts so the UI can be
 * built before backend/api/ exists (PROMPT.md §12.2).
 *
 * Real: roster, prices, status/news, ownership, season stats, teams, deadlines —
 *       from data/snapshot.json (built from the backend's cached FPL pulls).
 * Mock: predictions, fixtures, manager squads, leagues, per-GW backtest series.
 *       Every response says `source: "mock"` and the UI labels it.
 *
 * Everything is seeded, so the same request always returns the same numbers.
 */
import snapshot from './data/snapshot.json';
import { solveLineup, type Candidate } from '@/lib/fpl/lineup';
import { OUT_STATUSES, oneYellowFromBan } from '@/lib/fpl/players';
import type {
  BacktestResponse,
  Fixture,
  FixturesResponse,
  Horizon,
  LeaguesResponse,
  Lineup,
  ManagerSquadResponse,
  MetaResponse,
  Player,
  PlayersResponse,
  PlayerStatus,
  Position,
  TeamsResponse,
} from '@/lib/api/schemas';

type SnapshotPlayer = Omit<
  Player,
  'prediction' | 'status' | 'position' | 'yellowCards' | 'oneYellowFromBan'
> & {
  status: string;
  position: string;
  /** Older snapshots predate this field; see mockYellows. */
  yellowCards?: number;
};

const SOURCE = 'mock' as const;
const teams = snapshot.teams;
const events = snapshot.events;
const roster = (snapshot.players as SnapshotPlayer[]).map((p) => ({
  ...p,
  status: p.status as PlayerStatus,
  position: p.position as Position,
  yellowCards: p.yellowCards ?? mockYellows(p.id, p.minutes),
}));
const dataFetchedAt = snapshot.sourceFetchedAt;
/** Pretend the model ran an hour after the data pull. */
const predictionsGeneratedAt = new Date(Date.parse(dataFetchedAt) + 3_600_000).toISOString();

/* ---------------- seeded randomness ---------------- */

/** Deterministic stand-in for snapshots without card data: ~1 yellow per 400 minutes. */
function mockYellows(id: number, minutes: number): number {
  return Math.floor((minutes / 400) * mulberry32(id * 7)() * 2);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------- gameweeks ---------------- */

function gameweekState(now = new Date()) {
  const next = events.find((e) => Date.parse(e.deadline) > now.getTime()) ?? events.at(-1)!;
  return {
    nextGw: next.id,
    currentGw: next.id > 1 ? next.id - 1 : null,
    nextDeadline: next.deadline,
  };
}

/* ---------------- fixtures (mock schedule) ---------------- */

function buildFixtures(): Fixture[] {
  // Circle-method double round-robin, deterministic.
  const ids = teams.map((t) => t.id);
  const n = ids.length;
  const rounds: [number, number][][] = [];
  const rot = [...ids];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i]!;
      const b = rot[n - 1 - i]!;
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    rot.splice(1, 0, rot.pop()!);
  }
  const all = [...rounds, ...rounds.map((p) => p.map(([h, a]) => [a, h] as [number, number]))];
  const strength = new Map(teams.map((t) => [t.id, t]));
  const rnd = mulberry32(2026);
  const nowGw = gameweekState().nextGw;
  let id = 1;
  return all.slice(0, events.length).flatMap((pairs, i) => {
    const gw = i + 1;
    const ev = events[i]!;
    const kickoff = new Date(Date.parse(ev.deadline) + 90 * 60_000).toISOString();
    return pairs.map(([h, a]) => {
      const finished = gw < nowGw;
      // Difficulty a team faces = opponent's strength (FPL-style 1–5; null → 3).
      const homeDifficulty = clampFdr(strength.get(a)?.strengthAway ?? 3);
      const awayDifficulty = clampFdr(strength.get(h)?.strengthHome ?? 3);
      return {
        id: id++,
        gw,
        kickoff,
        homeTeamId: h,
        awayTeamId: a,
        homeDifficulty,
        awayDifficulty,
        finished,
        homeScore: finished ? Math.floor(rnd() * 4) : null,
        awayScore: finished ? Math.floor(rnd() * 3) : null,
      };
    });
  });
}
const clampFdr = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
const FIXTURES = buildFixtures();

/* ---------------- predictions (mock model) ---------------- */

function difficultyFor(teamId: number, gw: number): number {
  const f = FIXTURES.find(
    (x) => x.gw === gw && (x.homeTeamId === teamId || x.awayTeamId === teamId),
  );
  if (!f) return 5;
  return f.homeTeamId === teamId ? f.homeDifficulty : f.awayDifficulty;
}

function predictOne(p: (typeof roster)[number], horizon: Horizon, nextGw: number) {
  const rnd = mulberry32(p.id * 31 + horizon);
  const plays =
    p.minutes > 0 ? Math.min(1, p.minutes / (90 * Math.max(1, nextGw - 1)) + 0.15) : 0.05;
  let points = 0;
  for (let k = 0; k < horizon; k++) {
    const fdr = difficultyFor(p.teamId, nextGw + k);
    const fixtureFactor = 1.25 - fdr * 0.1;
    const base = 0.45 * p.form + 0.45 * p.pointsPerGame + 0.4;
    points += Math.max(0, base * plays * fixtureFactor + (rnd() - 0.5) * 0.8);
  }
  if (OUT_STATUSES.has(p.status)) points = 0;
  else if (p.chanceOfPlaying !== null && p.chanceOfPlaying < 100) points *= p.chanceOfPlaying / 100;
  // Honest spread: single-GW football is mostly noise; longer horizons tighten relatively.
  const spread = points * (horizon === 1 ? 0.7 : horizon === 3 ? 0.45 : 0.35) + 0.6;
  return {
    points: round1(points),
    low: round1(Math.max(0, points - spread)),
    high: round1(points + spread * 1.4),
  };
}

const predictionCache = new Map<Horizon, Player[]>();
function playersFor(horizon: Horizon): Player[] {
  const cached = predictionCache.get(horizon);
  if (cached) return cached;
  const { nextGw } = gameweekState();
  const players = roster.map((p) => ({
    ...p,
    oneYellowFromBan: p.status !== 's' && oneYellowFromBan(p.yellowCards, nextGw),
    prediction: predictOne(p, horizon, nextGw),
  }));
  predictionCache.set(horizon, players);
  return players;
}

/* ---------------- manager squads (mock) ---------------- */

const SHAPE: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const MIN_PRICE: Record<Position, number> = { GK: 4.0, DEF: 4.0, MID: 4.5, FWD: 4.5 };

function pickSquad(teamId: number): Player[] {
  const rnd = mulberry32(teamId);
  const pool = playersFor(1)
    .filter((p) => p.minutes > 0)
    .map((p) => ({ p, score: p.pointsPerGame + p.form * 0.5 + rnd() * 2.5 }))
    .sort((a, b) => b.score - a.score);
  let budget = 100;
  const need = { ...SHAPE };
  const perClub = new Map<number, number>();
  const chosen: Player[] = [];
  const reserve = () =>
    (Object.keys(need) as Position[]).reduce((s, pos) => s + need[pos] * MIN_PRICE[pos], 0);
  // Order slots so premium FWD/MID get first call on the budget.
  for (const pos of ['FWD', 'MID', 'DEF', 'GK'] as Position[]) {
    for (const { p } of pool) {
      if (need[pos] === 0) break;
      if (p.position !== pos || chosen.includes(p)) continue;
      if ((perClub.get(p.teamId) ?? 0) >= 3) continue;
      const after = budget - p.price;
      need[pos]--;
      if (after < reserve() - 1e-9) {
        need[pos]++;
        continue;
      }
      budget = after;
      chosen.push(p);
      perClub.set(p.teamId, (perClub.get(p.teamId) ?? 0) + 1);
    }
  }
  return chosen;
}

function lineupFor(squad: Player[], horizon: Horizon): Lineup {
  const { nextGw } = gameweekState();
  const oneGw = new Map(playersFor(1).map((p) => [p.id, p]));
  const excluded = squad
    .filter(
      (p) => OUT_STATUSES.has(p.status) || (p.chanceOfPlaying !== null && p.chanceOfPlaying < 75),
    )
    .map((p) => ({
      playerId: p.id,
      reason: OUT_STATUSES.has(p.status)
        ? `${p.webName} is flagged ${p.status === 'i' ? 'injured' : p.status === 's' ? 'suspended' : 'unavailable'}`
        : `${p.webName} has a ${p.chanceOfPlaying}% chance of playing`,
    }));
  const excludedIds = new Set(excluded.map((e) => e.playerId));
  const candidates: Candidate[] = squad
    .filter((p) => !excludedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      position: p.position,
      predicted: p.prediction.points,
      captainScore: oneGw.get(p.id)?.prediction.points ?? p.prediction.points,
    }));
  let solved;
  try {
    solved = solveLineup(candidates);
  } catch {
    // Too many absentees to field a legal XI — fall back to ignoring the gate.
    solved = solveLineup(
      squad.map((p) => ({ id: p.id, position: p.position, predicted: p.prediction.points })),
    );
    excluded.length = 0;
  }
  const single = (id: number) => oneGw.get(id)?.prediction;
  const starters = solved.starters.map((c) => ({ playerId: c.id, predicted: c.predicted }));
  const bench = [
    ...solved.bench.map((c) => ({ playerId: c.id, predicted: c.predicted })),
    ...squad
      .filter((p) => excludedIds.has(p.id))
      .map((p) => ({ playerId: p.id, predicted: p.prediction.points })),
  ];
  // Team total = Σ starters + captain again. Ranges don't add linearly (eleven players
  // won't all hit their ceiling at once), so combine deviations in quadrature, assuming
  // independence. The real backend should supply this from simulation; this is an approximation.
  const counted = [...solved.starters.map((c) => c.id), solved.captainId];
  const total = counted.reduce((s, id) => s + (single(id)?.points ?? 0), 0);
  const spread = (side: 'low' | 'high') =>
    Math.sqrt(
      counted.reduce(
        (s, id) => s + ((single(id)?.[side] ?? 0) - (single(id)?.points ?? 0)) ** 2,
        0,
      ),
    );
  return {
    source: SOURCE,
    dataFetchedAt,
    predictionsGeneratedAt,
    gw: nextGw,
    horizon,
    formation: solved.formation,
    starters,
    bench,
    captainId: solved.captainId,
    viceCaptainId: solved.viceCaptainId,
    projectedPoints: round1(total),
    projectedRange: {
      low: round1(Math.max(0, total - spread('low'))),
      high: round1(total + spread('high')),
    },
    excluded,
  };
}

/* ---------------- public resolvers ---------------- */

export const db = {
  meta(): MetaResponse {
    const gw = gameweekState();
    return {
      source: SOURCE,
      dataFetchedAt,
      predictionsGeneratedAt,
      predictionsGw: gw.nextGw,
      ...gw,
      // Headline numbers are the REAL walk-forward results from the repo README.
      model: {
        name: 'gbm',
        spearman: 0.273,
        spearmanStd: 0.1,
        beatsPersistencePct: 90,
        heldOutGameweeks: 147,
      },
    };
  },
  teams(): TeamsResponse {
    return { source: SOURCE, dataFetchedAt, teams };
  },
  players(horizon: Horizon): PlayersResponse {
    return {
      source: SOURCE,
      dataFetchedAt,
      predictionsGeneratedAt,
      gw: gameweekState().nextGw,
      horizon,
      players: playersFor(horizon),
    };
  },
  fixtures(fromGw: number, toGw: number): FixturesResponse {
    return {
      source: SOURCE,
      dataFetchedAt,
      fixtures: FIXTURES.filter((f) => f.gw >= fromGw && f.gw <= toGw),
    };
  },
  managerSquad(teamId: number, horizon: Horizon): ManagerSquadResponse {
    const rnd = mulberry32(teamId * 7);
    const byId = new Map(playersFor(horizon).map((p) => [p.id, p]));
    const squad = pickSquad(teamId).map((p) => byId.get(p.id)!);
    const spent = squad.reduce((s, p) => s + p.price, 0);
    const { currentGw } = gameweekState();
    const played = Math.max(1, currentGw ?? 1);
    const lastGwPoints = 30 + Math.floor(rnd() * 55);
    return {
      source: SOURCE,
      dataFetchedAt,
      predictionsGeneratedAt,
      manager: {
        id: teamId,
        playerName: 'Mock Manager',
        teamName: `Mock XI #${teamId}`,
        overallRank: 50_000 + Math.floor(rnd() * 4_000_000),
        overallPoints: played * 48 + Math.floor(rnd() * 120),
        lastGwPoints,
        lastGwRank: 100_000 + Math.floor(rnd() * 6_000_000),
        previousGwPoints: 30 + Math.floor(rnd() * 55),
        bank: round1(Math.max(0, 100 - spent)),
        teamValue: round1(spent + 0.4 + rnd() * 1.6),
        freeTransfers: 1 + Math.floor(rnd() * 2),
      },
      squad: squad.map((p) => ({
        playerId: p.id,
        sellingPrice: round1(p.price - (rnd() < 0.2 ? 0.1 : 0)),
      })),
      recommended: lineupFor(squad, horizon),
    };
  },
  leagues(teamId: number): LeaguesResponse {
    const rnd = mulberry32(teamId * 13);
    const names = [
      'Alex',
      'Sam',
      'Jordan',
      'Riley',
      'Casey',
      'Morgan',
      'Taylor',
      'Jamie',
      'Drew',
      'Avery',
      'Quinn',
    ];
    const mk = (id: number, name: string, size: number) => {
      const entries = Array.from({ length: size }, (_, i) => {
        const self = i === 0;
        return {
          entryId: self ? teamId : 1000 + id * 100 + i,
          playerName: self ? 'Mock Manager' : `${names[i % names.length]} (mock)`,
          teamName: self ? `Mock XI #${teamId}` : `Mock Team ${id}-${i}`,
          gwPoints: 25 + Math.floor(rnd() * 60),
          total: 300 + Math.floor(rnd() * 180),
        };
      });
      const sorted = [...entries].sort((a, b) => b.total - a.total);
      const prev = [...entries].sort((a, b) => b.total - b.gwPoints - (a.total - a.gwPoints));
      return {
        id,
        name,
        entries: sorted.map((e, i) => ({
          ...e,
          rank: i + 1,
          lastRank: prev.findIndex((x) => x.entryId === e.entryId) + 1,
        })),
      };
    };
    return {
      source: SOURCE,
      dataFetchedAt,
      leagues: [
        mk(1, 'Office League (mock)', 12),
        mk(2, 'Uni Friends (mock)', 8),
        mk(3, 'Family (mock)', 6),
      ],
    };
  },
  backtest(horizon: Horizon): BacktestResponse {
    // Per-GW series is MOCK, drawn around the README's real headline means.
    const targets: Record<Horizon, [number, number, number]> = {
      1: [0.273, 0.1, 0.112],
      3: [0.4, 0.08, 0.2],
      6: [0.47, 0.06, 0.22],
    };
    const target = targets[horizon];
    const [mean, sd, persistence] = target;
    const rnd = mulberry32(horizon * 101);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
    return {
      source: SOURCE,
      model: 'gbm',
      horizon,
      metric: 'spearman',
      series: Array.from({ length: 38 }, (_, i) => ({
        label: `24-25 GW${i + 1}`,
        model: round2(mean + gauss() * sd),
        persistence: round2(persistence + gauss() * 0.09),
      })),
    };
  },
};

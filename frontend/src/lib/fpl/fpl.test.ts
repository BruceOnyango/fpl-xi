import type { Fixture, Player, Position } from '@/lib/api/schemas';
import { averageDifficulty, fixtureRun, fixturesForTeam } from './fixtures';
import { assessFreshness } from './freshness';
import { solveLineup, pitchRows, type Candidate } from './lineup';
import { availabilityOf, flaggedPlayers, valueScore } from './players';
import { simulateTransfers, validateSquad } from './rules';

const HOUR = 3_600_000;

function player(id: number, position: Position, overrides: Partial<Player> = {}): Player {
  return {
    id,
    webName: `P${id}`,
    firstName: 'F',
    secondName: `P${id}`,
    teamId: id,
    position,
    price: 5,
    status: 'a',
    chanceOfPlaying: null,
    news: '',
    selectedByPercent: 1,
    form: 3,
    totalPoints: 10,
    pointsPerGame: 3,
    minutes: 450,
    xg: 0,
    xa: 0,
    prediction: { points: 3, low: 1, high: 6 },
    ...overrides,
  };
}

/** Legal 15: ids 1-2 GK, 3-7 DEF, 8-12 MID, 13-15 FWD, all different clubs. */
function legalSquad(): Player[] {
  const shape: [Position, number][] = [
    ['GK', 2],
    ['DEF', 5],
    ['MID', 5],
    ['FWD', 3],
  ];
  let id = 1;
  return shape.flatMap(([pos, n]) => Array.from({ length: n }, () => player(id++, pos)));
}

describe('solveLineup', () => {
  const c = (
    id: number,
    position: Position,
    predicted: number,
    captainScore?: number,
  ): Candidate => ({
    id,
    position,
    predicted,
    ...(captainScore === undefined ? {} : { captainScore }),
  });

  it('picks the formation that maximises total predicted points', () => {
    const squad = [
      c(1, 'GK', 4),
      c(2, 'GK', 2),
      ...[5, 5, 1, 1, 1].map((p, i) => c(10 + i, 'DEF', p)),
      ...[6, 6, 6, 6, 6].map((p, i) => c(20 + i, 'MID', p)),
      ...[2, 2, 2].map((p, i) => c(30 + i, 'FWD', p)),
    ];
    const lineup = solveLineup(squad);
    // 3 DEF (5,5,1) + 5 MID (6×5) + 2 FWD (2,2) beats every other shape.
    expect(lineup.formation).toBe('3-5-2');
    expect(lineup.starters).toHaveLength(11);
    expect(lineup.bench[0]?.position).toBe('GK');
    expect(lineup.total).toBeCloseTo(4 + 11 + 30 + 4 + 6);
  });

  it('captains on captainScore when given, not the horizon score', () => {
    const squad = [
      c(1, 'GK', 2),
      c(2, 'GK', 1),
      ...Array.from({ length: 5 }, (_, i) => c(10 + i, 'DEF', 3)),
      ...Array.from({ length: 5 }, (_, i) => c(20 + i, 'MID', 3)),
      c(30, 'FWD', 20, 4),
      c(31, 'FWD', 10, 9),
      c(32, 'FWD', 2),
    ];
    const lineup = solveLineup(squad);
    expect(lineup.captainId).toBe(31);
    expect(lineup.viceCaptainId).toBe(30);
  });

  it('throws without a goalkeeper', () => {
    expect(() => solveLineup([c(1, 'DEF', 1)])).toThrow(/goalkeeper/);
  });

  it('groups pitch rows GK→FWD', () => {
    const rows = pitchRows([{ position: 'FWD' as const }, { position: 'GK' as const }]);
    expect(rows.map((r) => r.length)).toEqual([1, 0, 0, 1]);
  });
});

describe('validateSquad / simulateTransfers', () => {
  it('accepts a legal squad', () => {
    expect(validateSquad(legalSquad(), 0.5)).toEqual([]);
  });

  it('flags budget, club limit and position count', () => {
    const squad = legalSquad().map((p, i) => (i < 4 ? { ...p, teamId: 99 } : p));
    const violations = validateSquad(squad.slice(0, 14), -1.2);
    expect(violations).toEqual(
      expect.arrayContaining([
        { kind: 'budget', overBy: 1.2 },
        { kind: 'club-limit', teamId: 99, count: 4 },
        { kind: 'position-count', position: 'FWD', count: 2, required: 3 },
      ]),
    );
  });

  it('computes bank, hits and net point delta', () => {
    const squad = legalSquad();
    const incoming = player(100, 'FWD', { price: 9, prediction: { points: 8, low: 3, high: 14 } });
    const incoming2 = player(101, 'MID', { price: 5, prediction: { points: 4, low: 1, high: 8 } });
    const result = simulateTransfers({
      squad,
      sellingPrices: new Map([[15, 5.4]]),
      bank: 4,
      freeTransfers: 1,
      transfers: [
        { outId: 15, inId: 100 },
        { outId: 12, inId: 101 },
      ],
      players: new Map([
        [100, incoming],
        [101, incoming2],
      ]),
    });
    expect(result.bankAfter).toBe(0.4); // 4 + 5.4 + 5 − 9 − 5
    expect(result.hitCost).toBe(4);
    expect(result.rawPointDelta).toBeCloseTo(8 - 3 + 4 - 3);
    expect(result.netPointDelta).toBeCloseTo(2);
    expect(result.violations).toEqual([]);
  });
});

describe('fixtures', () => {
  const fx = (id: number, gw: number, h: number, a: number, hd = 2, ad = 4): Fixture => ({
    id,
    gw,
    kickoff: '2026-11-01T15:00:00Z',
    homeTeamId: h,
    awayTeamId: a,
    homeDifficulty: hd,
    awayDifficulty: ad,
    finished: false,
    homeScore: null,
    awayScore: null,
  });
  const fixtures = [fx(1, 10, 1, 2), fx(2, 11, 3, 1, 3, 5), fx(3, 12, 2, 3)];

  it('views fixtures from the team side', () => {
    expect(fixturesForTeam(fixtures, 1)).toEqual([
      { fixtureId: 1, gw: 10, opponentId: 2, home: true, difficulty: 2 },
      { fixtureId: 2, gw: 11, opponentId: 3, home: false, difficulty: 5 },
    ]);
  });

  it('marks blanks and averages with blanks as 5', () => {
    const run = fixtureRun(fixtures, 1, 10, 12);
    expect(run.map((c) => c.length)).toEqual([1, 1, 0]);
    expect(averageDifficulty(run)).toBeCloseTo((2 + 5 + 5) / 3);
  });
});

describe('assessFreshness', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  it('is ok for recent data far from the deadline', () => {
    expect(
      assessFreshness(new Date(now.getTime() - HOUR), now, new Date(now.getTime() + 72 * HOUR))
        .level,
    ).toBe('ok');
  });
  it('warns near the deadline when data is a few hours old', () => {
    const f = assessFreshness(
      new Date(now.getTime() - 4 * HOUR),
      now,
      new Date(now.getTime() + 5 * HOUR),
    );
    expect(f.level).toBe('warn');
    expect(f.reason).toMatch(/deadline/);
  });
  it('is stale after 48h', () => {
    expect(assessFreshness(new Date(now.getTime() - 49 * HOUR), now).level).toBe('stale');
  });
});

describe('players', () => {
  it('derives availability like the backend gate', () => {
    expect(availabilityOf({ status: 'i', chanceOfPlaying: 0 })).toBe('out');
    expect(availabilityOf({ status: 'd', chanceOfPlaying: 75 })).toBe('doubtful');
    expect(availabilityOf({ status: 'a', chanceOfPlaying: null })).toBe('available');
  });
  it('orders flagged players by severity', () => {
    const list = flaggedPlayers([
      player(1, 'MID', { status: 'd', chanceOfPlaying: 75 }),
      player(2, 'MID', { status: 'i', chanceOfPlaying: 0 }),
      player(3, 'MID'),
    ]);
    expect(list.map((p) => p.id)).toEqual([2, 1]);
  });
  it('computes value per £m', () => {
    expect(valueScore({ price: 5, prediction: { points: 10, low: 0, high: 0 } })).toBe(2);
  });
});

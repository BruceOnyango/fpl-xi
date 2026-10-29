/** Fixture-run helpers for the FDR ticker. Pure. */
import type { Fixture } from '@/lib/api/schemas';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface TeamFixture {
  fixtureId: number;
  gw: number;
  opponentId: number;
  home: boolean;
  difficulty: Difficulty;
}

const asDifficulty = (n: number): Difficulty =>
  Math.min(5, Math.max(1, Math.round(n))) as Difficulty;

/** A team's fixtures from the team's point of view. */
export function fixturesForTeam(fixtures: readonly Fixture[], teamId: number): TeamFixture[] {
  return fixtures
    .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
    .map((f) => {
      const home = f.homeTeamId === teamId;
      return {
        fixtureId: f.id,
        gw: f.gw,
        opponentId: home ? f.awayTeamId : f.homeTeamId,
        home,
        difficulty: asDifficulty(home ? f.homeDifficulty : f.awayDifficulty),
      };
    })
    .sort((a, b) => a.gw - b.gw);
}

/**
 * One cell per gameweek in [fromGw, toGw]. An empty array is a blank gameweek;
 * two entries is a double.
 */
export function fixtureRun(
  fixtures: readonly Fixture[],
  teamId: number,
  fromGw: number,
  toGw: number,
): TeamFixture[][] {
  const mine = fixturesForTeam(fixtures, teamId);
  const run: TeamFixture[][] = [];
  for (let gw = fromGw; gw <= toGw; gw++) run.push(mine.filter((f) => f.gw === gw));
  return run;
}

/** Mean difficulty over a run; blanks count as 5 (no points is the worst fixture). */
export function averageDifficulty(run: readonly TeamFixture[][]): number {
  if (run.length === 0) return 0;
  const total = run.reduce(
    (s, cell) =>
      s + (cell.length === 0 ? 5 : cell.reduce((a, f) => a + f.difficulty, 0) / cell.length),
    0,
  );
  return total / run.length;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very hard',
};

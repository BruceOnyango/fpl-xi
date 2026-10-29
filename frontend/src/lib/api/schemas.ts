/**
 * Zod schemas for every API response — the boundary between the network and the app.
 * Components only ever see the inferred types below (PROMPT.md §8).
 *
 * Keep in sync with the FastAPI layer (backend/api/) once it exists; until then the
 * MSW handlers in src/mocks/ implement this contract.
 */
import { z } from 'zod';

/** ISO-8601 timestamp string. Kept as a string; parse with `new Date()` at the edge. */
const isoDate = z.iso.datetime({ offset: true });

export const positionSchema = z.enum(['GK', 'DEF', 'MID', 'FWD']);
export type Position = z.infer<typeof positionSchema>;

/** FPL availability status: a=available d=doubtful i=injured s=suspended u=unavailable n=not in squad */
export const playerStatusSchema = z.enum(['a', 'd', 'i', 's', 'u', 'n']);
export type PlayerStatus = z.infer<typeof playerStatusSchema>;

export const dataSourceSchema = z.enum(['mock', 'live']);
export type DataSource = z.infer<typeof dataSourceSchema>;

/** Every recommendation-bearing response carries these (PROMPT.md §8 "Data freshness"). */
const freshnessFields = {
  source: dataSourceSchema,
  /** When the backend last pulled from the FPL API (prices, injury flags). */
  dataFetchedAt: isoDate,
};
const predictionFreshnessFields = {
  ...freshnessFields,
  /** When the model last computed predictions / the XI. */
  predictionsGeneratedAt: isoDate,
};

export const predictionSchema = z.object({
  /** Point estimate over `horizon` gameweeks. */
  points: z.number(),
  /** Plausible range — never show `points` without it where space allows. */
  low: z.number(),
  high: z.number(),
});
export type Prediction = z.infer<typeof predictionSchema>;

export const teamSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  shortName: z.string(),
  strengthHome: z.number().nullable(),
  strengthAway: z.number().nullable(),
});
export type Team = z.infer<typeof teamSchema>;

export const teamsResponseSchema = z.object({
  ...freshnessFields,
  teams: z.array(teamSchema),
});
export type TeamsResponse = z.infer<typeof teamsResponseSchema>;

export const playerSchema = z.object({
  id: z.number().int(),
  webName: z.string(),
  firstName: z.string(),
  secondName: z.string(),
  teamId: z.number().int(),
  position: positionSchema,
  /** £m, one decimal (FPL now_cost / 10). */
  price: z.number(),
  status: playerStatusSchema,
  chanceOfPlaying: z.number().nullable(),
  news: z.string(),
  selectedByPercent: z.number(),
  form: z.number(),
  totalPoints: z.number(),
  pointsPerGame: z.number(),
  minutes: z.number(),
  xg: z.number(),
  xa: z.number(),
  prediction: predictionSchema,
});
export type Player = z.infer<typeof playerSchema>;

export const horizonSchema = z.union([z.literal(1), z.literal(3), z.literal(6)]);
export type Horizon = z.infer<typeof horizonSchema>;

export const playersResponseSchema = z.object({
  ...predictionFreshnessFields,
  gw: z.number().int(),
  horizon: horizonSchema,
  players: z.array(playerSchema),
});
export type PlayersResponse = z.infer<typeof playersResponseSchema>;

export const fixtureSchema = z.object({
  id: z.number().int(),
  gw: z.number().int(),
  kickoff: isoDate,
  homeTeamId: z.number().int(),
  awayTeamId: z.number().int(),
  homeDifficulty: z.number().int().min(1).max(5),
  awayDifficulty: z.number().int().min(1).max(5),
  finished: z.boolean(),
  homeScore: z.number().int().nullable(),
  awayScore: z.number().int().nullable(),
});
export type Fixture = z.infer<typeof fixtureSchema>;

export const fixturesResponseSchema = z.object({
  ...freshnessFields,
  fixtures: z.array(fixtureSchema),
});
export type FixturesResponse = z.infer<typeof fixturesResponseSchema>;

export const lineupSlotSchema = z.object({
  playerId: z.number().int(),
  predicted: z.number(),
});
export type LineupSlot = z.infer<typeof lineupSlotSchema>;

export const lineupSchema = z.object({
  ...predictionFreshnessFields,
  gw: z.number().int(),
  horizon: horizonSchema,
  /** e.g. "3-4-3" (DEF-MID-FWD). */
  formation: z.string().regex(/^\d-\d-\d$/),
  starters: z.array(lineupSlotSchema).length(11),
  bench: z.array(lineupSlotSchema),
  captainId: z.number().int(),
  viceCaptainId: z.number().int(),
  /** Starters' total incl. captain double, single-GW. */
  projectedPoints: z.number(),
  projectedRange: z.object({ low: z.number(), high: z.number() }),
  /** Players the availability gate removed before the solver ran. */
  excluded: z.array(z.object({ playerId: z.number().int(), reason: z.string() })),
});
export type Lineup = z.infer<typeof lineupSchema>;

export const managerSchema = z.object({
  id: z.number().int(),
  playerName: z.string(),
  teamName: z.string(),
  overallRank: z.number().int().nullable(),
  overallPoints: z.number(),
  lastGwPoints: z.number(),
  lastGwRank: z.number().int().nullable(),
  previousGwPoints: z.number().nullable(),
  /** £m in the bank. */
  bank: z.number(),
  /** £m squad value. */
  teamValue: z.number(),
  freeTransfers: z.number().int(),
});
export type Manager = z.infer<typeof managerSchema>;

export const squadPickSchema = z.object({
  playerId: z.number().int(),
  /** £m the manager would receive on sale. */
  sellingPrice: z.number(),
});
export type SquadPick = z.infer<typeof squadPickSchema>;

export const managerSquadResponseSchema = z.object({
  ...predictionFreshnessFields,
  manager: managerSchema,
  squad: z.array(squadPickSchema).length(15),
  recommended: lineupSchema,
});
export type ManagerSquadResponse = z.infer<typeof managerSquadResponseSchema>;

export const metaResponseSchema = z.object({
  ...freshnessFields,
  /** Null until predictions have been exported (scripts/export_predictions.py). */
  predictionsGeneratedAt: isoDate.nullable(),
  /** Gameweek the exported predictions were made for; can lag `nextGw`. */
  predictionsGw: z.number().int().nullable(),
  currentGw: z.number().int().nullable(),
  nextGw: z.number().int(),
  nextDeadline: isoDate,
  model: z
    .object({
      name: z.string(),
      /** Headline started-pool Spearman from the walk-forward backtest. */
      spearman: z.number(),
      spearmanStd: z.number(),
      beatsPersistencePct: z.number(),
      heldOutGameweeks: z.number().int(),
    })
    /** Null until a backtest is saved (scripts/evaluate.py --save). */
    .nullable(),
});
export type MetaResponse = z.infer<typeof metaResponseSchema>;

export const backtestResponseSchema = z.object({
  source: dataSourceSchema,
  model: z.string(),
  horizon: horizonSchema,
  metric: z.literal('spearman'),
  series: z.array(
    z.object({
      label: z.string(),
      model: z.number(),
      persistence: z.number(),
    }),
  ),
});
export type BacktestResponse = z.infer<typeof backtestResponseSchema>;

export const leagueEntrySchema = z.object({
  entryId: z.number().int(),
  rank: z.number().int(),
  lastRank: z.number().int().nullable(),
  playerName: z.string(),
  teamName: z.string(),
  gwPoints: z.number(),
  total: z.number(),
});
export type LeagueEntry = z.infer<typeof leagueEntrySchema>;

export const leagueSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  entries: z.array(leagueEntrySchema),
});
export type League = z.infer<typeof leagueSchema>;

export const leaguesResponseSchema = z.object({
  ...freshnessFields,
  leagues: z.array(leagueSchema),
});
export type LeaguesResponse = z.infer<typeof leaguesResponseSchema>;

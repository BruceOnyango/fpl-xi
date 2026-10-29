/**
 * Contract test: every mock response must satisfy the Zod schemas the app parses with.
 * If the backend contract changes, this fails before the UI does.
 */
import { api } from './client';

describe('API contract (mock backend)', () => {
  it('parses meta, teams, players and fixtures', async () => {
    const meta = await api.meta();
    expect(meta.source).toBe('mock');
    expect(meta.nextGw).toBeGreaterThan(0);
    const [teams, players, fixtures] = await Promise.all([
      api.teams(),
      api.players(1),
      api.fixtures(meta.nextGw, meta.nextGw + 4),
    ]);
    expect(teams.teams).toHaveLength(20);
    expect(players.players.length).toBeGreaterThan(500);
    expect(fixtures.fixtures.length).toBeGreaterThan(0);
  });

  it('returns a legal 15-man squad with an 11-man recommended XI', async () => {
    const res = await api.managerSquad(8350133, 6);
    expect(res.squad).toHaveLength(15);
    expect(res.recommended.starters).toHaveLength(11);
    expect(res.recommended.horizon).toBe(6);
    expect(res.manager.bank).toBeGreaterThanOrEqual(0);
  });

  it('surfaces 404s as a human ApiError', async () => {
    await expect(api.managerSquad(404, 1)).rejects.toMatchObject({ name: 'ApiError', status: 404 });
  });

  it('parses leagues and backtest', async () => {
    const [leagues, backtest] = await Promise.all([api.leagues(1), api.backtest(1)]);
    expect(leagues.leagues.length).toBeGreaterThan(0);
    expect(backtest.series.length).toBeGreaterThan(0);
  });
});

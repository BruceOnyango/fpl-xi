// Builds src/mocks/data/snapshot.json from the backend's cached FPL API pulls
// (../backend/data/raw/*.json, produced by `python scripts/fetch_data.py` in backend/).
//
// What is REAL here: player names, clubs, positions, prices, status/news,
// ownership, season stats, team names, gameweek deadlines — all copied from the
// public FPL bootstrap data the backend already cached.
// What is NOT here: predictions and fixtures. Those are generated at runtime by
// the MSW handlers and are labelled as mock in the UI (PROMPT.md §15).
//
// Usage: npm run mock:roster   (re-run after fetch_data.py to refresh)
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const raw = resolve(here, '../../backend/data/raw');
const out = resolve(here, '../src/mocks/data/snapshot.json');

const read = (f) => JSON.parse(readFileSync(resolve(raw, f), 'utf8'));
const players = read('players.json');
const teams = read('teams.json');
const events = read('events.json');

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));

const snapshot = {
  note: 'Real FPL bootstrap fields only. Predictions/fixtures are generated as mock at runtime.',
  builtAt: new Date().toISOString(),
  // When the backend last pulled from the FPL API — this becomes dataFetchedAt.
  sourceFetchedAt: statSync(resolve(raw, 'players.json')).mtime.toISOString(),
  teams: teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.short_name,
    strengthHome: t.strength_overall_home,
    strengthAway: t.strength_overall_away,
  })),
  events: events.map((e) => ({
    id: e.id,
    deadline: e.deadline_time,
    finished: e.finished,
    averageScore: e.average_entry_score,
    highestScore: e.highest_score,
  })),
  players: players
    .filter((p) => !p.removed && POS[p.element_type])
    .map((p) => ({
      id: p.id,
      webName: p.web_name,
      firstName: p.first_name,
      secondName: p.second_name,
      teamId: p.team,
      position: POS[p.element_type],
      price: num(p.now_cost) / 10,
      status: p.status,
      chanceOfPlaying: p.chance_of_playing_next_round,
      news: p.news ?? '',
      selectedByPercent: num(p.selected_by_percent),
      form: num(p.form),
      totalPoints: num(p.total_points),
      pointsPerGame: num(p.points_per_game),
      minutes: num(p.minutes),
      xg: num(p.expected_goals),
      xa: num(p.expected_assists),
    })),
};

writeFileSync(out, JSON.stringify(snapshot));
console.log(`wrote ${snapshot.players.length} players, ${snapshot.teams.length} teams -> ${out}`);

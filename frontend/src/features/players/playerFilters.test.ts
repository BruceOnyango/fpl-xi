import type { Player } from '@/lib/api/schemas';
import { applyFilters, readFilters, writeFilters } from './playerFilters';

const p = (id: number, over: Partial<Player>): Player => ({
  id,
  webName: 'X',
  firstName: 'X',
  secondName: 'X',
  teamId: 1,
  position: 'MID',
  price: 5,
  status: 'a',
  chanceOfPlaying: null,
  news: '',
  selectedByPercent: 0,
  form: 0,
  totalPoints: 0,
  pointsPerGame: 0,
  minutes: 0,
  xg: 0,
  xa: 0,
  yellowCards: 0,
  oneYellowFromBan: false,
  prediction: { points: 0, low: 0, high: 0 },
  ...over,
});

describe('player filters', () => {
  it('round-trips through the URL and rejects junk', () => {
    const f = readFilters(new URLSearchParams('q=saka&pos=MID&team=1&max=8.5&fit=1&cmp=3,4,x,5,6'));
    expect(f).toEqual({
      q: 'saka',
      pos: 'MID',
      team: 1,
      maxPrice: 8.5,
      fitOnly: true,
      compare: [3, 4, 5],
    });
    expect(readFilters(writeFilters(f))).toEqual(f);
    expect(readFilters(new URLSearchParams('pos=GOAL&team=-1')).pos).toBe('ALL');
  });

  it('filters by position, price, fitness and accent-insensitive name', () => {
    const players = [
      p(1, { webName: 'Ødegaard', firstName: 'Martin', secondName: 'Ødegaard', price: 8.4 }),
      p(2, { webName: 'João Pedro', position: 'FWD', price: 7.9 }),
      p(3, { webName: 'Joao Felix', status: 'i' }),
    ];
    const base = readFilters(new URLSearchParams());
    expect(applyFilters(players, { ...base, q: 'joao' }).map((x) => x.id)).toEqual([2, 3]);
    expect(applyFilters(players, { ...base, q: 'joao', fitOnly: true }).map((x) => x.id)).toEqual([
      2,
    ]);
    expect(applyFilters(players, { ...base, pos: 'MID', maxPrice: 8 }).map((x) => x.id)).toEqual([
      3,
    ]);
  });
});

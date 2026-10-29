/** Players-page filters, kept in the URL so views are shareable (§8). Pure. */
import type { Player, Position } from '@/lib/api/schemas';
import { availabilityOf } from '@/lib/fpl/players';

export interface PlayerFilters {
  q: string;
  pos: Position | 'ALL';
  team: number | null;
  maxPrice: number | null;
  fitOnly: boolean;
  compare: number[];
}

const POSITIONS = new Set(['GK', 'DEF', 'MID', 'FWD']);
export const COMPARE_LIMIT = 3;

export function readFilters(p: URLSearchParams): PlayerFilters {
  const pos = p.get('pos') ?? 'ALL';
  const team = Number(p.get('team'));
  const maxPrice = Number(p.get('max'));
  return {
    q: p.get('q') ?? '',
    pos: POSITIONS.has(pos) ? (pos as Position) : 'ALL',
    team: Number.isInteger(team) && team > 0 ? team : null,
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null,
    fitOnly: p.get('fit') === '1',
    compare: (p.get('cmp') ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, COMPARE_LIMIT),
  };
}

export function writeFilters(f: PlayerFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.pos !== 'ALL') p.set('pos', f.pos);
  if (f.team) p.set('team', String(f.team));
  if (f.maxPrice) p.set('max', String(f.maxPrice));
  if (f.fitOnly) p.set('fit', '1');
  if (f.compare.length) p.set('cmp', f.compare.join(','));
  return p;
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function applyFilters(players: readonly Player[], f: PlayerFilters): Player[] {
  const needle = normalize(f.q.trim());
  return players.filter(
    (p) =>
      (f.pos === 'ALL' || p.position === f.pos) &&
      (f.team === null || p.teamId === f.team) &&
      (f.maxPrice === null || p.price <= f.maxPrice) &&
      (!f.fitOnly || availabilityOf(p) === 'available') &&
      (!needle || normalize(`${p.webName} ${p.firstName} ${p.secondName}`).includes(needle)),
  );
}

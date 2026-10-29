import { useMemo } from 'react';
import { BlankFixtureChip, FixtureChip } from '@/components/molecules';
import type { Fixture, Team } from '@/lib/api/schemas';
import { averageDifficulty, fixtureRun } from '@/lib/fpl/fixtures';
import { cn } from '@/lib/utils/cn';

export interface FixtureTickerProps {
  teams: readonly Team[];
  fixtures: readonly Fixture[];
  fromGw: number;
  toGw: number;
  /** Order rows by easiest run first. Otherwise keeps `teams` order. */
  sortByEase?: boolean;
  /** Opponent name lookup when `teams` is a subset. Defaults to looking up within `teams`. */
  opponentShort?: (teamId: number) => string;
  /** Team ids to emphasise (e.g. clubs in your squad). */
  highlight?: ReadonlySet<number>;
  caption: string;
  className?: string;
}

/**
 * Teams × gameweeks difficulty grid. A real <table> with a caption so screen readers
 * can navigate by row/column; every cell prints opponent, venue and FDR number.
 */
export function FixtureTicker({
  teams,
  fixtures,
  fromGw,
  toGw,
  sortByEase = false,
  opponentShort,
  highlight,
  caption,
  className,
}: FixtureTickerProps) {
  const shortById = useMemo(() => new Map(teams.map((t) => [t.id, t.shortName])), [teams]);
  const rows = useMemo(() => {
    const r = teams.map((t) => {
      const run = fixtureRun(fixtures, t.id, fromGw, toGw);
      return { team: t, run, avg: averageDifficulty(run) };
    });
    return sortByEase
      ? r.sort((a, b) => a.avg - b.avg || a.team.name.localeCompare(b.team.name))
      : r;
  }, [teams, fixtures, fromGw, toGw, sortByEase]);
  const gws = Array.from({ length: toGw - fromGw + 1 }, (_, i) => fromGw + i);

  return (
    <div
      // Focusable + labelled so keyboard users can scroll it sideways on small screens.
      // Scrollable regions must be keyboard-focusable (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label={caption}
      className={cn('relative overflow-x-auto', className)}
    >
      <table className="w-full border-separate border-spacing-x-1 border-spacing-y-1 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-2xs text-muted tracking-wide uppercase">
            <th scope="col" className="bg-surface sticky left-0 z-[1] px-1 font-semibold">
              Team
            </th>
            {gws.map((gw) => (
              <th key={gw} scope="col" className="min-w-[4.5rem] px-1 font-semibold">
                GW {gw}
              </th>
            ))}
            <th scope="col" className="px-1 text-right font-semibold">
              <abbr title="Average difficulty (blanks count as 5)">Avg</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ team, run, avg }) => (
            <tr key={team.id}>
              <th
                scope="row"
                className={cn(
                  'bg-surface sticky left-0 z-[1] px-1 text-sm font-semibold whitespace-nowrap',
                  highlight?.has(team.id) && 'text-accent-text',
                )}
              >
                {team.shortName}
                {highlight?.has(team.id) ? <span className="sr-only"> (in your squad)</span> : null}
              </th>
              {run.map((cell, i) => (
                <td key={gws[i]} className="align-top">
                  <div className="flex flex-col gap-0.5">
                    {cell.length === 0 ? (
                      <BlankFixtureChip size="sm" className="w-full" />
                    ) : (
                      cell.map((f) => (
                        <FixtureChip
                          key={f.fixtureId}
                          size="sm"
                          className="w-full"
                          opponentShort={
                            opponentShort
                              ? opponentShort(f.opponentId)
                              : (shortById.get(f.opponentId) ?? '—')
                          }
                          home={f.home}
                          difficulty={f.difficulty}
                        />
                      ))
                    )}
                  </div>
                </td>
              ))}
              <td className="tabular px-1 text-right text-sm font-semibold">{avg.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { League } from '@/lib/api/schemas';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils/cn';

export interface LeagueTableProps {
  league: League;
  /** Highlight the viewer's row. */
  selfEntryId?: number | null;
  className?: string;
}

function Movement({ rank, lastRank }: { rank: number; lastRank: number | null }) {
  if (lastRank === null || lastRank === rank) {
    return (
      <span className="text-muted inline-flex items-center" title="No change">
        <Minus aria-hidden className="h-3.5 w-3.5" />
        <span className="sr-only">No change</span>
      </span>
    );
  }
  const up = rank < lastRank;
  const n = Math.abs(lastRank - rank);
  return (
    <span
      className={cn(
        'tabular inline-flex items-center text-xs font-semibold',
        up ? 'text-positive' : 'text-negative',
      )}
    >
      {up ? (
        <ArrowUp aria-hidden className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown aria-hidden className="h-3.5 w-3.5" />
      )}
      {n}
      <span className="sr-only">
        {up ? ` place${n > 1 ? 's' : ''} up` : ` place${n > 1 ? 's' : ''} down`}
      </span>
    </span>
  );
}

export function LeagueTable({ league, selfEntryId = null, className }: LeagueTableProps) {
  return (
    <div
      // Scrollable regions must be keyboard-focusable (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label={`${league.name} standings`}
      className={cn('relative overflow-x-auto', className)}
    >
      <table className="w-full text-sm">
        <caption className="sr-only">{league.name} standings</caption>
        <thead className="text-muted text-xs">
          <tr className="border-border border-b">
            <th scope="col" className="py-2 pr-2 text-left font-semibold">
              Rank
            </th>
            <th scope="col" className="py-2 pr-2 text-left font-semibold">
              <span className="sr-only">Movement</span>
            </th>
            <th scope="col" className="py-2 pr-2 text-left font-semibold">
              Team
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-semibold">
              GW
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="tabular">
          {league.entries.map((e) => {
            const self = e.entryId === selfEntryId;
            return (
              <tr
                key={e.entryId}
                className={cn('border-border border-b last:border-0', self && 'bg-accent-soft')}
                aria-current={self ? 'true' : undefined}
              >
                <td className="font-display py-2 pr-2 text-lg font-bold">{e.rank}</td>
                <td className="py-2 pr-2">
                  <Movement rank={e.rank} lastRank={e.lastRank} />
                </td>
                <td className="py-2 pr-2">
                  <p className="font-semibold">
                    {e.teamName}
                    {self ? (
                      <span className="text-accent-text ml-1 text-xs font-medium">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-muted text-xs">{e.playerName}</p>
                </td>
                <td className="py-2 pr-2 text-right">{e.gwPoints}</td>
                <td className="py-2 text-right font-semibold">{formatInteger(e.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

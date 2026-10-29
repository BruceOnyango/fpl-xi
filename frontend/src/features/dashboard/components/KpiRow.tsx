import { Landmark, Medal, Sparkles, Timer, TrendingUp } from 'lucide-react';
import { Card } from '@/components/atoms';
import { DeadlineCountdown, StatTile } from '@/components/molecules';
import type { Lineup, Manager, MetaResponse } from '@/lib/api/schemas';
import { formatInteger, formatPoints, formatPrice, formatRank } from '@/lib/format';

export interface KpiRowProps {
  manager: Manager | null;
  lineup: Lineup | null;
  meta: MetaResponse | undefined;
  loading: boolean;
}

/** Headline numbers across the top of the dashboard. */
export function KpiRow({ manager, lineup, meta, loading }: KpiRowProps) {
  const lastDelta =
    manager && manager.previousGwPoints !== null
      ? manager.lastGwPoints - manager.previousGwPoints
      : null;
  return (
    <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatTile
        tone="accent"
        icon={<Sparkles className="h-4 w-4" />}
        loading={loading}
        label="Projected · next GW"
        value={lineup ? formatPoints(lineup.projectedPoints) : '—'}
        hint={
          lineup ? (
            <span>
              likely {formatPoints(lineup.projectedRange.low)}–
              {formatPoints(lineup.projectedRange.high)}
            </span>
          ) : undefined
        }
      />
      <StatTile
        icon={<TrendingUp className="h-4 w-4" />}
        loading={loading}
        label="Last GW"
        value={manager ? manager.lastGwPoints : '—'}
        delta={lastDelta !== null ? { value: lastDelta, digits: 0, unit: 'vs prev' } : undefined}
      />
      <StatTile
        icon={<Medal className="h-4 w-4" />}
        loading={loading}
        label="Overall rank"
        value={manager ? formatRank(manager.overallRank) : '—'}
        hint={manager ? `${formatInteger(manager.overallPoints)} pts total` : undefined}
      />
      <StatTile
        icon={<Landmark className="h-4 w-4" />}
        loading={loading}
        label="In the bank"
        value={manager ? formatPrice(manager.bank) : '—'}
        hint={
          manager
            ? `Value ${formatPrice(manager.teamValue)} · ${manager.freeTransfers} free transfer${manager.freeTransfers === 1 ? '' : 's'}`
            : undefined
        }
      />
      <Card as="div" className="relative p-4 sm:col-span-2 xl:col-span-1">
        <Timer aria-hidden className="text-muted absolute top-4 right-4 h-4 w-4" />
        {meta ? (
          <DeadlineCountdown gw={meta.nextGw} deadline={meta.nextDeadline} />
        ) : (
          <div className="h-[4.5rem]" />
        )}
      </Card>
    </section>
  );
}

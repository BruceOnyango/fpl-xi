import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, PriceTag, Skeleton } from '@/components/atoms';
import { PlayerName, PredictionRange, QueryState } from '@/components/molecules';
import { horizonLabel } from '@/components/organisms';
import { usePlayerPredictions, useTeamMap } from '@/lib/api/hooks';
import type { Horizon } from '@/lib/api/schemas';
import { availabilityOf } from '@/lib/fpl/players';

export interface TransferTargetsProps {
  horizon: Horizon;
  /** Exclude players already owned. */
  ownedIds: ReadonlySet<number>;
  limit?: number;
}

/** Top predicted, fit players you don't own — the "who to bring in" teaser. */
export function TransferTargets({ horizon, ownedIds, limit = 6 }: TransferTargetsProps) {
  const players = usePlayerPredictions(horizon);
  const teams = useTeamMap();
  const top = useMemo(
    () =>
      (players.data?.players ?? [])
        .filter((p) => !ownedIds.has(p.id) && availabilityOf(p) === 'available')
        .sort((a, b) => b.prediction.points - a.prediction.points)
        .slice(0, limit),
    [players.data, ownedIds, limit],
  );
  const max = Math.max(1, ...top.map((p) => p.prediction.high));

  return (
    <Card aria-labelledby="targets-title">
      <CardHeader
        id="targets-title"
        title="Transfer targets"
        description={`Highest projected over the ${horizonLabel(horizon)}, fit and not in your squad.`}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/transfers">Plan transfers</Link>
          </Button>
        }
      />
      <CardBody className="pt-3">
        <QueryState
          query={players}
          loading={
            <div className="space-y-3">
              {Array.from({ length: limit }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          }
          isEmpty={top.length === 0}
        >
          <ol className="divide-border divide-y">
            {top.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <PlayerName
                    name={p.webName}
                    fullName={`${p.firstName} ${p.secondName}`}
                    teamShort={teams.get(p.teamId)?.shortName ?? '—'}
                    position={p.position}
                  />
                  <PriceTag price={p.price} />
                </div>
                <PredictionRange prediction={p.prediction} max={max} />
              </li>
            ))}
          </ol>
        </QueryState>
      </CardBody>
    </Card>
  );
}

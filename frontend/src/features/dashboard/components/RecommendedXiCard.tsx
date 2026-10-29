import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/atoms';
import { DataFreshness, InjuryNudge } from '@/components/molecules';
import { horizonLabel, SquadPitch } from '@/components/organisms';
import type { MetaResponse } from '@/lib/api/schemas';
import type { SquadView } from '@/lib/api/views';

export interface RecommendedXiCardProps {
  view: SquadView;
  meta: MetaResponse | undefined;
}

export function RecommendedXiCard({ view, meta }: RecommendedXiCardProps) {
  const { lineup } = view;
  const excludedIds = new Set(lineup.excluded.map((e) => e.playerId));
  return (
    <Card aria-labelledby="xi-title">
      <CardHeader
        id="xi-title"
        title="Recommended XI"
        description={`Picked on the ${horizonLabel(lineup.horizon)} outlook; captaincy uses next GW only.`}
        actions={
          <>
            <Badge tone="accent" title="DEF-MID-FWD">
              {lineup.formation}
            </Badge>
            <Button asChild variant="secondary" size="sm">
              <Link to="/my-team">Full squad</Link>
            </Button>
          </>
        }
      />
      <CardBody className="flex flex-col gap-4 pt-4">
        <DataFreshness
          dataFetchedAt={lineup.dataFetchedAt}
          predictionsGeneratedAt={lineup.predictionsGeneratedAt}
          source={lineup.source}
          nextDeadline={meta?.nextDeadline}
        />
        <SquadPitch
          starters={view.starters}
          bench={view.bench}
          captainId={lineup.captainId}
          viceCaptainId={lineup.viceCaptainId}
          excludedIds={excludedIds}
          label="Recommended starting eleven"
        />
        {lineup.excluded.length ? (
          <p className="text-muted text-xs">
            <strong className="text-text">Availability gate:</strong>{' '}
            {lineup.excluded.map((e) => e.reason).join('; ')} — benched before the solver ran.
          </p>
        ) : null}
        <InjuryNudge compact />
      </CardBody>
    </Card>
  );
}

import { Shirt } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardBody, Skeleton } from '@/components/atoms';
import { DataFreshness, EmptyState, InjuryNudge, QueryState } from '@/components/molecules';
import {
  CaptaincyPanel,
  FlaggedPlayers,
  HorizonToggle,
  ModelConfidence,
  TeamIdForm,
} from '@/components/organisms';
import { PageLayout } from '@/components/templates';
import { useSquadView } from '@/lib/api/views';
import { useSettings } from '@/lib/settings';
import { usePageTitle } from '@/lib/utils/usePageTitle';
import { KpiRow } from './components/KpiRow';
import { RecommendedXiCard } from './components/RecommendedXiCard';
import { SquadFixtures } from './components/SquadFixtures';
import { TransferTargets } from './components/TransferTargets';

function SquadSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <Skeleton className="h-[34rem] rounded-xl" />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { settings } = useSettings();
  const { teamId, horizon } = settings;
  const { query, view, meta, fixtureContext } = useSquadView(teamId, horizon);

  const ownedIds = useMemo(() => new Set(view?.squad.map((p) => p.id) ?? []), [view]);
  const clubIds = useMemo(() => new Set(view?.squad.map((p) => p.teamId) ?? []), [view]);

  return (
    <PageLayout
      eyebrow={meta ? `Gameweek ${meta.nextGw}` : 'Gameweek'}
      title={view ? view.manager.teamName : 'Dashboard'}
      description={
        view
          ? `Managed by ${view.manager.playerName}. Who to start, who to captain and who to bring in.`
          : 'Who to start, who to captain and who to bring in — this week.'
      }
      actions={<HorizonToggle />}
      banner={
        meta ? (
          <DataFreshness
            variant="banner"
            dataFetchedAt={meta.dataFetchedAt}
            predictionsGeneratedAt={meta.predictionsGeneratedAt}
            source={meta.source}
            nextDeadline={meta.nextDeadline}
          />
        ) : null
      }
    >
      <KpiRow
        manager={view?.manager ?? null}
        lineup={view?.lineup ?? null}
        meta={meta}
        loading={teamId !== null && !view}
      />

      {teamId === null ? (
        <Card aria-labelledby="no-team-title">
          <CardBody className="flex flex-col items-center gap-2">
            <EmptyState
              icon={<Shirt className="h-5 w-5" />}
              title="Add your FPL team ID to get your recommended XI"
              description="We'll load your 15, pick the best legal lineup and captain, and flag anyone injured."
            />
            <h2 id="no-team-title" className="sr-only">
              Connect your team
            </h2>
            <TeamIdForm />
            <InjuryNudge className="mt-4 w-full max-w-xl" />
          </CardBody>
        </Card>
      ) : (
        <QueryState query={query} loading={<SquadSkeleton />}>
          {view ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
              <RecommendedXiCard view={view} meta={meta} />
              <div className="flex flex-col gap-6">
                <CaptaincyPanel
                  candidates={view.captainPool}
                  captainId={view.lineup.captainId}
                  viceCaptainId={view.lineup.viceCaptainId}
                />
                <FlaggedPlayers
                  players={view.squad}
                  teamShort={fixtureContext.teamShort}
                  excludedReasons={view.excludedReasons}
                />
              </div>
            </div>
          ) : null}
        </QueryState>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <ModelConfidence horizon={horizon} />
        <TransferTargets horizon={horizon} ownedIds={ownedIds} />
      </div>

      {meta ? <SquadFixtures nextGw={meta.nextGw} teamIds={clubIds} /> : null}
    </PageLayout>
  );
}

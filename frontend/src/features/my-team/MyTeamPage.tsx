import { Shirt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Card, CardBody, CardHeader, Skeleton } from '@/components/atoms';
import { DataFreshness, EmptyState, InjuryNudge, QueryState } from '@/components/molecules';
import {
  FlaggedPlayers,
  HorizonToggle,
  horizonLabel,
  PlayerCard,
  SquadPitch,
  TeamIdForm,
} from '@/components/organisms';
import { PageLayout, SplitPaneLayout } from '@/components/templates';
import { useSquadView } from '@/lib/api/views';
import { formatPoints, formatPrice } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { usePageTitle } from '@/lib/utils/usePageTitle';
import { SquadList } from './SquadList';

export default function MyTeamPage() {
  usePageTitle('My Team');
  const { settings } = useSettings();
  const { teamId, horizon } = settings;
  const { query, view, meta, fixtureContext } = useSquadView(teamId, horizon);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = useMemo(() => {
    if (!view) return null;
    const id = selectedId ?? view.lineup.captainId;
    return view.squad.find((p) => p.id === id) ?? null;
  }, [view, selectedId]);
  const predictionMax = useMemo(
    () => Math.max(1, ...(view?.squad.map((p) => p.prediction.high) ?? [])),
    [view],
  );

  if (teamId === null) {
    return (
      <PageLayout
        title="My Team"
        description="Your 15, the best lineup from them, and who's flagged."
      >
        <Card aria-label="Connect your team">
          <CardBody className="flex flex-col items-center gap-2">
            <EmptyState
              icon={<Shirt className="h-5 w-5" />}
              title="No team loaded"
              description="Enter your FPL team ID to see your squad."
            />
            <TeamIdForm />
          </CardBody>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      eyebrow={meta ? `Gameweek ${meta.nextGw}` : undefined}
      title="My Team"
      description={
        view ? `${view.manager.teamName} · ${view.manager.playerName}` : 'Loading your squad…'
      }
      actions={<HorizonToggle />}
    >
      <QueryState
        query={query}
        loading={
          <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <Skeleton className="h-[36rem] rounded-xl" />
            <Skeleton className="h-[36rem] rounded-xl" />
          </div>
        }
      >
        {view ? (
          <SplitPaneLayout
            main={
              <>
                <Card aria-labelledby="pitch-title">
                  <CardHeader
                    id="pitch-title"
                    title="Best lineup from your 15"
                    description="Select a player to see their details."
                    actions={
                      <>
                        <Badge tone="accent">{view.lineup.formation}</Badge>
                        <Badge>{formatPoints(view.lineup.projectedPoints)} pts next GW</Badge>
                      </>
                    }
                  />
                  <CardBody className="flex flex-col gap-4 pt-4">
                    <DataFreshness
                      dataFetchedAt={view.lineup.dataFetchedAt}
                      predictionsGeneratedAt={view.lineup.predictionsGeneratedAt}
                      source={view.lineup.source}
                      nextDeadline={meta?.nextDeadline}
                    />
                    <SquadPitch
                      starters={view.starters}
                      bench={view.bench}
                      captainId={view.lineup.captainId}
                      viceCaptainId={view.lineup.viceCaptainId}
                      excludedIds={new Set(view.lineup.excluded.map((e) => e.playerId))}
                      onSelectPlayer={setSelectedId}
                      selectedId={selected?.id ?? null}
                    />
                    <InjuryNudge compact />
                  </CardBody>
                </Card>
                <Card aria-labelledby="squad-list-title">
                  <CardHeader
                    id="squad-list-title"
                    title="Squad"
                    description={`Bank ${formatPrice(view.manager.bank)} · value ${formatPrice(view.manager.teamValue)} · predictions over the ${horizonLabel(horizon)}`}
                  />
                  <CardBody className="pt-3">
                    <SquadList view={view} teamShort={fixtureContext.teamShort} />
                  </CardBody>
                </Card>
              </>
            }
            aside={
              <>
                {selected ? (
                  <PlayerCard
                    player={selected}
                    teamShort={fixtureContext.teamShort}
                    fixtures={fixtureContext.fixturesByTeam.get(selected.teamId) ?? []}
                    predictionMax={predictionMax}
                    horizonLabel={horizonLabel(horizon)}
                  />
                ) : null}
                <FlaggedPlayers
                  players={view.squad}
                  teamShort={fixtureContext.teamShort}
                  excludedReasons={view.excludedReasons}
                />
              </>
            }
          />
        ) : null}
      </QueryState>
    </PageLayout>
  );
}

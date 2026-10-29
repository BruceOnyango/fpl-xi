import * as Tabs from '@radix-ui/react-tabs';
import { Trophy } from 'lucide-react';
import { Card, CardBody, CardHeader, Skeleton } from '@/components/atoms';
import { DataFreshness, EmptyState, QueryState } from '@/components/molecules';
import { LeagueTable, TeamIdForm } from '@/components/organisms';
import { PageLayout } from '@/components/templates';
import { useLeagues } from '@/lib/api/hooks';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils/cn';
import { usePageTitle } from '@/lib/utils/usePageTitle';

export default function LeaguesPage() {
  usePageTitle('Leagues');
  const { settings } = useSettings();
  const leagues = useLeagues(settings.teamId);

  if (settings.teamId === null) {
    return (
      <PageLayout title="Leagues" description="Your mini-league standings.">
        <Card aria-label="Connect your team">
          <CardBody className="flex flex-col items-center gap-2">
            <EmptyState
              icon={<Trophy className="h-5 w-5" />}
              title="Add your team ID to see your leagues"
            />
            <TeamIdForm />
          </CardBody>
        </Card>
      </PageLayout>
    );
  }

  const list = leagues.data?.leagues ?? [];
  return (
    <PageLayout
      title="Leagues"
      description="Mini-league standings, this gameweek's points and movement since last week."
    >
      <Card aria-labelledby="leagues-title">
        <CardHeader
          id="leagues-title"
          title="Standings"
          actions={
            leagues.data ? (
              <DataFreshness
                dataFetchedAt={leagues.data.dataFetchedAt}
                source={leagues.data.source}
              />
            ) : null
          }
        />
        <CardBody className="pt-3">
          <QueryState
            query={leagues}
            loading={<Skeleton className="h-96 w-full" />}
            isEmpty={list.length === 0}
            empty={
              <EmptyState
                title="You're not in any mini-leagues"
                description="Join or create one on the FPL site and it will appear here."
              />
            }
          >
            <Tabs.Root defaultValue={String(list[0]?.id ?? '')}>
              <Tabs.List
                aria-label="Your leagues"
                className="border-border mb-4 flex flex-wrap gap-1 border-b"
              >
                {list.map((l) => (
                  <Tabs.Trigger
                    key={l.id}
                    value={String(l.id)}
                    className={cn(
                      'text-muted hover:text-text -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-semibold',
                      'data-[state=active]:border-accent data-[state=active]:text-text',
                    )}
                  >
                    {l.name}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {list.map((l) => (
                <Tabs.Content key={l.id} value={String(l.id)}>
                  <LeagueTable league={l} selfEntryId={settings.teamId} />
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </QueryState>
        </CardBody>
      </Card>
    </PageLayout>
  );
}

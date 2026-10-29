import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, FdrBadge, Skeleton } from '@/components/atoms';
import { DataFreshness, QueryState, SegmentedControl } from '@/components/molecules';
import { FixtureTicker } from '@/components/organisms';
import { PageLayout } from '@/components/templates';
import { useFixtures, useMeta, useTeams } from '@/lib/api/hooks';
import { useSquadView } from '@/lib/api/views';
import { combineQueries } from '@/lib/api/combine';
import { DIFFICULTY_LABEL, type Difficulty } from '@/lib/fpl/fixtures';
import { useSettings } from '@/lib/settings';
import { usePageTitle } from '@/lib/utils/usePageTitle';

const SPANS = [
  { value: 3, label: '3 GW' },
  { value: 5, label: '5 GW' },
  { value: 8, label: '8 GW' },
] as const;
const SORTS = [
  { value: 'ease', label: 'Easiest run' },
  { value: 'name', label: 'A–Z' },
] as const;

export default function FixturesPage() {
  usePageTitle('Fixtures');
  const { settings } = useSettings();
  const [span, setSpan] = useState<3 | 5 | 8>(5);
  const [sort, setSort] = useState<'ease' | 'name'>('ease');
  const meta = useMeta();
  const teams = useTeams();
  const from = meta.data?.nextGw;
  const to = from === undefined ? undefined : Math.min(38, from + span - 1);
  const fixtures = useFixtures(from, to);
  // Highlight clubs in the manager's squad when a team is loaded.
  const { view } = useSquadView(settings.teamId, settings.horizon);
  const highlight = useMemo(() => new Set(view?.squad.map((p) => p.teamId) ?? []), [view]);
  const sortedTeams = useMemo(
    () => [...(teams.data?.teams ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [teams.data],
  );

  return (
    <PageLayout
      title="Fixtures"
      description="Fixture difficulty by club. Every cell shows the opponent, venue and a 1–5 difficulty number."
      actions={
        <>
          <SegmentedControl
            label="Gameweeks to show"
            options={SPANS}
            value={span}
            onChange={setSpan}
            size="sm"
          />
          <SegmentedControl
            label="Sort clubs"
            options={SORTS}
            value={sort}
            onChange={setSort}
            size="sm"
          />
        </>
      }
    >
      <Card aria-labelledby="ticker-title">
        <CardHeader
          id="ticker-title"
          title={from !== undefined && to !== undefined ? `GW ${from}–${to}` : 'Fixture ticker'}
          description={
            highlight.size
              ? 'Clubs in your squad are highlighted. Blank gameweeks count as 5 in the average.'
              : 'Blank gameweeks count as 5 in the average.'
          }
          actions={
            fixtures.data ? (
              <DataFreshness
                dataFetchedAt={fixtures.data.dataFetchedAt}
                source={fixtures.data.source}
                nextDeadline={meta.data?.nextDeadline}
              />
            ) : null
          }
        />
        <CardBody className="flex flex-col gap-4 pt-3">
          <ul
            aria-label="Difficulty key"
            className="text-muted flex flex-wrap items-center gap-3 text-xs"
          >
            {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
              <li key={d} className="flex items-center gap-1.5">
                <FdrBadge difficulty={d} /> {DIFFICULTY_LABEL[d]}
              </li>
            ))}
          </ul>
          <QueryState
            query={combineQueries(meta, teams, fixtures)}
            loading={<Skeleton className="h-[40rem] w-full" />}
          >
            {from !== undefined && to !== undefined ? (
              <FixtureTicker
                teams={sortedTeams}
                fixtures={fixtures.data?.fixtures ?? []}
                fromGw={from}
                toGw={to}
                sortByEase={sort === 'ease'}
                highlight={highlight}
                caption={`Fixture difficulty for every club, gameweeks ${from} to ${to}`}
              />
            ) : null}
          </QueryState>
        </CardBody>
      </Card>
    </PageLayout>
  );
}

import { Card, CardBody, CardHeader, Skeleton } from '@/components/atoms';
import { QueryState } from '@/components/molecules';
import { FixtureTicker } from '@/components/organisms';
import { useFixtures, useTeams } from '@/lib/api/hooks';
import { LOOKAHEAD } from '@/lib/api/views';

export interface SquadFixturesProps {
  nextGw: number;
  /** Clubs to show; all clubs when empty. */
  teamIds: ReadonlySet<number>;
}

/** Fixture run for the clubs in your squad, easiest first. */
export function SquadFixtures({ nextGw, teamIds }: SquadFixturesProps) {
  const toGw = nextGw + LOOKAHEAD - 1;
  const fixtures = useFixtures(nextGw, toGw);
  const teams = useTeams();
  const all = teams.data?.teams ?? [];
  const shown = all.filter((t) => teamIds.size === 0 || teamIds.has(t.id));
  const shortById = new Map(all.map((t) => [t.id, t.shortName]));
  return (
    <Card aria-labelledby="squad-fixtures-title">
      <CardHeader
        id="squad-fixtures-title"
        title={teamIds.size ? 'Your clubs’ fixtures' : 'Fixture run'}
        description={`GW ${nextGw}–${toGw}, easiest run first. Numbers are difficulty, 1 (easy) to 5 (hard).`}
      />
      <CardBody className="pt-3">
        <QueryState
          query={{
            isPending: fixtures.isPending || teams.isPending,
            isError: fixtures.isError || teams.isError,
            error: fixtures.error ?? teams.error,
            refetch: () => {
              void fixtures.refetch();
              void teams.refetch();
            },
          }}
          loading={<Skeleton className="h-64 w-full" />}
          isEmpty={shown.length === 0}
        >
          <FixtureTicker
            teams={shown}
            fixtures={fixtures.data?.fixtures ?? []}
            fromGw={nextGw}
            toGw={toGw}
            sortByEase
            opponentShort={(id) => shortById.get(id) ?? '—'}
            caption={`Fixture difficulty for ${teamIds.size ? 'your clubs' : 'all clubs'}, gameweeks ${nextGw} to ${toGw}`}
          />
        </QueryState>
      </CardBody>
    </Card>
  );
}

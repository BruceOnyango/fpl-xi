import { useCallback, useId, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Skeleton } from '@/components/atoms';
import {
  DataFreshness,
  EmptyState,
  QueryState,
  SearchField,
  SegmentedControl,
} from '@/components/molecules';
import { HorizonToggle, horizonLabel, PlayerCard, PlayerTable } from '@/components/organisms';
import { PageLayout } from '@/components/templates';
import { usePlayerPredictions, useTeams } from '@/lib/api/hooks';
import type { Position } from '@/lib/api/schemas';
import { useFixtureContext } from '@/lib/api/views';
import { useSettings } from '@/lib/settings';
import { usePageTitle } from '@/lib/utils/usePageTitle';
import {
  applyFilters,
  COMPARE_LIMIT,
  readFilters,
  writeFilters,
  type PlayerFilters,
} from './playerFilters';

const POS_OPTIONS: { value: Position | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'GK', label: 'GK' },
  { value: 'DEF', label: 'DEF' },
  { value: 'MID', label: 'MID' },
  { value: 'FWD', label: 'FWD' },
];
const PRICE_CAPS = [4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 12];

const selectClass = 'h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text';

export default function PlayersPage() {
  usePageTitle('Players');
  const { settings } = useSettings();
  const { horizon } = settings;
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  const set = useCallback(
    (patch: Partial<PlayerFilters>) =>
      setParams(writeFilters({ ...filters, ...patch }), { replace: true }),
    [filters, setParams],
  );

  const players = usePlayerPredictions(horizon);
  const teams = useTeams();
  const { context, meta } = useFixtureContext();
  const teamId = useId();
  const priceId = useId();

  const shown = useMemo(
    () => applyFilters(players.data?.players ?? [], filters),
    [players.data, filters],
  );
  const compareSet = useMemo(() => new Set(filters.compare), [filters.compare]);
  const comparing = useMemo(
    () =>
      filters.compare
        .map((id) => players.data?.players.find((p) => p.id === id))
        .filter((p) => p !== undefined),
    [filters.compare, players.data],
  );
  const toggleCompare = useCallback(
    (id: number) =>
      set({
        compare: compareSet.has(id)
          ? filters.compare.filter((x) => x !== id)
          : [...filters.compare, id].slice(0, COMPARE_LIMIT),
      }),
    [compareSet, filters.compare, set],
  );
  const compareMax = Math.max(1, ...comparing.map((p) => p.prediction.high));
  const hasFilters =
    filters.q || filters.pos !== 'ALL' || filters.team || filters.maxPrice || filters.fitOnly;

  return (
    <PageLayout
      title="Players"
      description="Every player, ranked by predicted points with a plausible range. Tick up to three to compare side by side."
      actions={<HorizonToggle />}
    >
      {comparing.length ? (
        <section aria-labelledby="compare-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              id="compare-title"
              className="font-display text-lg font-bold tracking-wide uppercase"
            >
              Comparing {comparing.length}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => set({ compare: [] })}>
              Clear comparison
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {comparing.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                teamShort={context.teamShort}
                fixtures={context.fixturesByTeam.get(p.teamId) ?? []}
                predictionMax={compareMax}
                horizonLabel={horizonLabel(horizon)}
                onRemove={() => toggleCompare(p.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Card aria-labelledby="explorer-title">
        <CardHeader
          id="explorer-title"
          title="Explorer"
          description={
            players.data ? `${shown.length} of ${players.data.players.length} players` : undefined
          }
          actions={
            players.data ? (
              <DataFreshness
                dataFetchedAt={players.data.dataFetchedAt}
                predictionsGeneratedAt={players.data.predictionsGeneratedAt}
                source={players.data.source}
                nextDeadline={meta?.nextDeadline}
              />
            ) : null
          }
        />
        <CardBody className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter players">
            <SearchField
              className="w-full sm:w-64"
              label="Search players"
              value={filters.q}
              onChange={(q) => set({ q })}
              placeholder="Search by name"
            />
            <SegmentedControl
              label="Position"
              options={POS_OPTIONS}
              value={filters.pos}
              onChange={(pos) => set({ pos })}
            />
            <div className="flex flex-col">
              <label htmlFor={teamId} className="text-muted mb-1 text-xs font-medium">
                Club
              </label>
              <select
                id={teamId}
                className={selectClass}
                value={filters.team ?? ''}
                onChange={(e) => set({ team: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">All clubs</option>
                {(teams.data?.teams ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor={priceId} className="text-muted mb-1 text-xs font-medium">
                Max price
              </label>
              <select
                id={priceId}
                className={selectClass}
                value={filters.maxPrice ?? ''}
                onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Any</option>
                {PRICE_CAPS.map((c) => (
                  <option key={c} value={c}>
                    £{c.toFixed(1)}m
                  </option>
                ))}
              </select>
            </div>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={filters.fitOnly}
                onChange={(e) => set({ fitOnly: e.target.checked })}
              />
              Fit players only
            </label>
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-10"
                onClick={() =>
                  setParams(
                    writeFilters({
                      ...readFilters(new URLSearchParams()),
                      compare: filters.compare,
                    }),
                    { replace: true },
                  )
                }
              >
                Reset filters
              </Button>
            ) : null}
          </div>
          <QueryState
            query={players}
            loading={<Skeleton className="h-[560px] w-full rounded-lg" />}
            isEmpty={shown.length === 0}
            empty={
              <EmptyState
                title="No players match"
                description="Loosen a filter — try a higher max price or all positions."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  >
                    Reset filters
                  </Button>
                }
              />
            }
          >
            <PlayerTable
              players={shown}
              teamShort={context.teamShort}
              compareIds={compareSet}
              onToggleCompare={toggleCompare}
              compareLimit={COMPARE_LIMIT}
              caption={`Players, predicted over the ${horizonLabel(horizon)}`}
            />
          </QueryState>
        </CardBody>
      </Card>
    </PageLayout>
  );
}

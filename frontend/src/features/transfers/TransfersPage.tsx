import { AlertTriangle, ArrowLeftRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PositionPill,
  PriceTag,
  Skeleton,
} from '@/components/atoms';
import {
  DataFreshness,
  EmptyState,
  InjuryNudge,
  QueryState,
  StatTile,
} from '@/components/molecules';
import { HorizonToggle, horizonLabel, TeamIdForm, TransferRow } from '@/components/organisms';
import { PageLayout, SplitPaneLayout } from '@/components/templates';
import type { Position } from '@/lib/api/schemas';
import { useSquadView } from '@/lib/api/views';
import { formatDelta, formatPoints, formatPrice } from '@/lib/format';
import { describeViolation } from '@/lib/fpl/rules';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils/cn';
import { usePageTitle } from '@/lib/utils/usePageTitle';
import { ReplacementPicker } from './ReplacementPicker';
import { useTransferPlan } from './useTransferPlan';

const ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

export default function TransfersPage() {
  usePageTitle('Transfers');
  const { settings } = useSettings();
  const { teamId, horizon } = settings;
  const { query, view, meta, fixtureContext } = useSquadView(teamId, horizon);
  const plan = useTransferPlan(view, horizon);
  const { result } = plan;
  const outIds = useMemo(() => new Set(plan.transfers.map((t) => t.outId)), [plan.transfers]);
  const ownedAfter = useMemo(
    () => new Set((result?.squadAfter ?? view?.squad ?? []).map((p) => p.id)),
    [result, view],
  );
  const pendingOut = view?.squad.find((p) => p.id === plan.pendingOutId) ?? null;
  const hLabel = horizonLabel(horizon);

  if (teamId === null) {
    return (
      <PageLayout title="Transfers" description="Simulate moves before you make them.">
        <Card aria-label="Connect your team">
          <CardBody className="flex flex-col items-center gap-2">
            <EmptyState
              icon={<ArrowLeftRight className="h-5 w-5" />}
              title="Load your squad to plan transfers"
            />
            <TeamIdForm />
          </CardBody>
        </Card>
      </PageLayout>
    );
  }

  const xiDelta =
    plan.xiBefore !== null && plan.xiAfter !== null
      ? plan.xiAfter - plan.xiBefore - (result?.hitCost ?? 0)
      : null;
  const legal = result ? result.violations.length === 0 : true;

  return (
    <PageLayout
      eyebrow={meta ? `Gameweek ${meta.nextGw}` : undefined}
      title="Transfer planner"
      description="Pick someone to sell, choose a replacement, and see the budget, club-limit and points impact live. Nothing is sent to FPL."
      actions={<HorizonToggle />}
    >
      <QueryState query={query} loading={<Skeleton className="h-[32rem] rounded-xl" />}>
        {view ? (
          <SplitPaneLayout
            main={
              <>
                <Card aria-labelledby="sell-title">
                  <CardHeader
                    id="sell-title"
                    title="Your squad"
                    description="Choose a player to sell."
                    actions={
                      <DataFreshness
                        dataFetchedAt={view.lineup.dataFetchedAt}
                        predictionsGeneratedAt={view.lineup.predictionsGeneratedAt}
                        source={view.lineup.source}
                        nextDeadline={meta?.nextDeadline}
                      />
                    }
                  />
                  <CardBody className="grid gap-4 pt-3 md:grid-cols-2">
                    {ORDER.map((pos) => (
                      <section key={pos} aria-label={pos}>
                        <ul className="flex flex-col gap-1.5">
                          {view.squad
                            .filter((p) => p.position === pos)
                            .map((p) => {
                              const sold = outIds.has(p.id);
                              const pending = plan.pendingOutId === p.id;
                              return (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    disabled={sold}
                                    aria-pressed={pending}
                                    onClick={() => plan.setPendingOut(pending ? null : p.id)}
                                    className={cn(
                                      'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                      pending
                                        ? 'border-focus bg-secondary-soft'
                                        : 'border-border bg-surface-2 hover:bg-surface-3',
                                      sold && 'opacity-50',
                                    )}
                                  >
                                    <PositionPill position={p.position} />
                                    <span className="min-w-0 flex-1 truncate font-semibold">
                                      {p.webName}
                                    </span>
                                    <span className="text-muted text-xs">
                                      {fixtureContext.teamShort(p.teamId)}
                                    </span>
                                    <span className="tabular text-xs">
                                      {formatPoints(p.prediction.points)}
                                    </span>
                                    <PriceTag
                                      price={view.sellingPrices.get(p.id) ?? p.price}
                                      className="text-xs"
                                    />
                                    {sold ? <Badge tone="negative">Sold</Badge> : null}
                                  </button>
                                </li>
                              );
                            })}
                        </ul>
                      </section>
                    ))}
                  </CardBody>
                </Card>
                {pendingOut ? (
                  <ReplacementPicker
                    out={pendingOut}
                    sellingPrice={view.sellingPrices.get(pendingOut.id) ?? pendingOut.price}
                    players={plan.players}
                    ownedIds={ownedAfter}
                    teamShort={fixtureContext.teamShort}
                    preview={plan.preview}
                    onPick={(inId) => plan.add({ outId: pendingOut.id, inId })}
                    onCancel={() => plan.setPendingOut(null)}
                  />
                ) : null}
              </>
            }
            aside={
              <>
                <Card aria-labelledby="plan-title">
                  <CardHeader
                    id="plan-title"
                    title="Plan"
                    description={`Points over the ${hLabel}, after hits.`}
                    actions={
                      plan.transfers.length ? (
                        <Button variant="ghost" size="sm" onClick={plan.reset}>
                          <RotateCcw aria-hidden className="h-3.5 w-3.5" /> Reset
                        </Button>
                      ) : null
                    }
                  />
                  <CardBody className="flex flex-col gap-4 pt-3">
                    <div className="grid grid-cols-2 gap-3" aria-live="polite">
                      <StatTile
                        label="Transfers"
                        value={`${plan.transfers.length} / ${view.manager.freeTransfers} free`}
                        hint={result && result.hitCost ? `−${result.hitCost} pt hit` : 'no hit'}
                      />
                      <StatTile
                        label="Bank after"
                        value={formatPrice(result?.bankAfter ?? view.manager.bank)}
                        hint={`now ${formatPrice(view.manager.bank)}`}
                      />
                      <StatTile
                        tone="accent"
                        label="Best-XI change"
                        value={xiDelta !== null ? formatDelta(xiDelta) : '—'}
                        hint="re-solved lineup, net of hits"
                        className="col-span-2"
                      />
                    </div>
                    <div role="status" aria-live="polite">
                      {legal ? (
                        <p className="text-positive flex items-center gap-1.5 text-sm">
                          <CheckCircle2 aria-hidden className="h-4 w-4" /> Squad is legal
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {result?.violations.map((v, i) => (
                            <li key={i} className="text-negative flex items-start gap-1.5 text-sm">
                              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                              {describeViolation(v, fixtureContext.teamShort)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {plan.transfers.length ? (
                      <ol className="flex flex-col gap-2">
                        {plan.transfers.map((t) => {
                          const out = view.squad.find((p) => p.id === t.outId);
                          const inn = plan.players.get(t.inId);
                          if (!out || !inn) return null;
                          return (
                            <TransferRow
                              key={t.outId}
                              out={out}
                              in={inn}
                              sellingPrice={view.sellingPrices.get(out.id) ?? out.price}
                              teamShort={fixtureContext.teamShort}
                              horizonLabel={hLabel}
                              onRemove={() => plan.remove(t.outId)}
                            />
                          );
                        })}
                      </ol>
                    ) : (
                      <EmptyState
                        className="py-4"
                        title="No transfers yet"
                        description="Select a player in your squad to sell."
                      />
                    )}
                  </CardBody>
                </Card>
                <InjuryNudge />
              </>
            }
          />
        ) : null}
      </QueryState>
    </PageLayout>
  );
}

import { useId, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, CardBody, CardHeader, Skeleton } from '@/components/atoms';
import { EmptyState, QueryState } from '@/components/molecules';
import { useBacktest, useMeta } from '@/lib/api/hooks';
import type { Horizon } from '@/lib/api/schemas';

export interface ModelConfidenceProps {
  horizon: Horizon;
  className?: string;
}

/**
 * "How much should I trust this?" — the walk-forward backtest, honestly framed.
 * Chart has an aria description and a table fallback (§7).
 */
export function ModelConfidence({ horizon, className }: ModelConfidenceProps) {
  const backtest = useBacktest(horizon);
  const meta = useMeta();
  const [asTable, setAsTable] = useState(false);
  const descId = useId();
  const series = backtest.data?.series ?? [];
  const mean = series.length ? series.reduce((s, x) => s + x.model, 0) / series.length : 0;
  const wins = series.filter((x) => x.model > x.persistence).length;
  const m = meta.data?.model;

  return (
    <Card aria-labelledby="confidence-title" className={className}>
      <CardHeader
        id="confidence-title"
        title="How much to trust this"
        description="Rank correlation (Spearman) between predicted and actual points, per held-out gameweek."
        actions={
          <>
            {backtest.data?.source === 'mock' ? <Badge tone="secondary">Mock series</Badge> : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
            >
              {asTable ? 'Show chart' : 'Show table'}
            </Button>
          </>
        }
      />
      <CardBody className="pt-3">
        <QueryState
          query={backtest}
          loading={<Skeleton className="h-56 w-full" />}
          isEmpty={series.length === 0}
          empty={
            <EmptyState
              title="No backtest saved yet"
              description={
                <>
                  Run{' '}
                  <code>cd backend && python scripts/evaluate.py --horizon {horizon} --save</code>{' '}
                  to show how the model has done week by week.
                </>
              }
            />
          }
        >
          {m ? (
            <p className="text-muted mb-3 text-sm">
              Across {m.heldOutGameweeks} held-out gameweeks the {m.name} model averages{' '}
              <strong className="text-text">
                {m.spearman.toFixed(2)} ± {m.spearmanStd.toFixed(2)}
              </strong>{' '}
              single-GW Spearman and beats &ldquo;repeat last week&rdquo; in{' '}
              <strong className="text-text">{m.beatsPersistencePct}%</strong> of them. That&apos;s a
              steady edge over a season — not a guarantee for any one Saturday.
            </p>
          ) : null}
          <p id={descId} className="sr-only">
            Line chart of {series.length} gameweeks. Model mean {mean.toFixed(2)}; model beats
            persistence in {wins} of {series.length}. Use the Show table button for exact values.
          </p>
          {asTable ? (
            <div className="relative max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Per-gameweek Spearman, model vs persistence</caption>
                <thead className="bg-surface text-muted sticky top-0 text-xs">
                  <tr>
                    <th scope="col" className="py-1 text-left font-semibold">
                      Gameweek
                    </th>
                    <th scope="col" className="py-1 text-right font-semibold">
                      Model
                    </th>
                    <th scope="col" className="py-1 text-right font-semibold">
                      Last-week baseline
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {series.map((r) => (
                    <tr key={r.label} className="border-border border-t">
                      <th scope="row" className="py-1 text-left font-normal">
                        {r.label}
                      </th>
                      <td className="py-1 text-right">{r.model.toFixed(2)}</td>
                      <td className="py-1 text-right">{r.persistence.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <figure aria-describedby={descId} className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={false} stroke="var(--border)" />
                  <YAxis
                    domain={[-0.2, 0.8]}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    stroke="var(--border)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                    }}
                    formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                  <ReferenceLine y={0} stroke="var(--subtle)" />
                  <Line
                    type="monotone"
                    dataKey="model"
                    name="Model"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="persistence"
                    name="Last-week baseline"
                    stroke="var(--secondary)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </figure>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
}

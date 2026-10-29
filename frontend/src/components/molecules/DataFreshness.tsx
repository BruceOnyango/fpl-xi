import { AlertTriangle, Clock, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/atoms';
import type { DataSource } from '@/lib/api/schemas';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { assessFreshness } from '@/lib/fpl/freshness';
import { cn } from '@/lib/utils/cn';

export interface DataFreshnessProps {
  /** When the backend last pulled from the FPL API. The one that matters most. */
  dataFetchedAt: string;
  /** When the model last ran. Shown when the surface carries predictions. */
  predictionsGeneratedAt?: string | null;
  source: DataSource;
  /** Tightens the staleness bar as it approaches. */
  nextDeadline?: string;
  /** Injected for tests/stories; defaults to the current time. */
  now?: Date;
  /** `inline` for card headers, `banner` for page-level warnings. */
  variant?: 'inline' | 'banner';
  className?: string;
}

/**
 * "Updated 2 hours ago" — escalating to a visible warning when data is old or the
 * deadline is close (PROMPT.md §8). Never shows client fetch time.
 */
export function DataFreshness({
  dataFetchedAt,
  predictionsGeneratedAt,
  source,
  nextDeadline,
  now = new Date(),
  variant = 'inline',
  className,
}: DataFreshnessProps) {
  const fetched = new Date(dataFetchedAt);
  const f = assessFreshness(fetched, now, nextDeadline ? new Date(nextDeadline) : null);
  const predicted = predictionsGeneratedAt ? new Date(predictionsGeneratedAt) : null;
  const tone =
    f.level === 'ok' ? 'text-muted' : f.level === 'warn' ? 'text-warning' : 'text-negative';
  const Icon = f.level === 'ok' ? Clock : AlertTriangle;

  const detail = (
    <>
      Data pulled{' '}
      <time dateTime={dataFetchedAt} title={formatDateTime(fetched)}>
        {formatRelativeTime(fetched, now)}
      </time>
      {predicted ? (
        <>
          {' · '}model run{' '}
          <time dateTime={predictionsGeneratedAt ?? undefined} title={formatDateTime(predicted)}>
            {formatRelativeTime(predicted, now)}
          </time>
        </>
      ) : null}
    </>
  );
  const mockBadge =
    source === 'mock' ? (
      <Badge
        tone="secondary"
        title="Predictions and fixtures are generated mock data, not model output"
      >
        <FlaskConical aria-hidden className="h-3 w-3" /> Mock data
      </Badge>
    ) : null;

  if (variant === 'banner') {
    if (f.level === 'ok') return null;
    return (
      <div
        role="status"
        className={cn(
          'flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          f.level === 'warn'
            ? 'border-warning/40 bg-warning-soft'
            : 'border-negative/40 bg-negative-soft',
          className,
        )}
      >
        <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} />
        <p className="min-w-0 flex-1">
          <strong className={cn('font-semibold', tone)}>
            {f.level === 'stale' ? 'This data is stale.' : 'Check this data.'}
          </strong>{' '}
          {f.reason} <span className="text-muted">{detail}.</span>
        </p>
        {mockBadge}
      </div>
    );
  }

  return (
    <p className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs', className)}>
      <span className={cn('inline-flex items-center gap-1.5', tone)}>
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {f.level !== 'ok' ? (
          <span className="font-semibold">{f.level === 'stale' ? 'Stale:' : 'Aging:'}</span>
        ) : null}
        <span>{detail}</span>
      </span>
      {mockBadge}
    </p>
  );
}

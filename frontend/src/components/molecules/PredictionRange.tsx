import type { Prediction } from '@/lib/api/schemas';
import { formatPoints } from '@/lib/format';
import { cn } from '@/lib/utils/cn';

export interface PredictionRangeProps {
  prediction: Prediction;
  /** Axis maximum, shared across rows so bars are comparable. */
  max: number;
  /** Visually hide the numbers (still announced). */
  compact?: boolean;
  className?: string;
}

/**
 * Point estimate with its plausible range — the antidote to false precision (§2).
 * The bar spans low→high; the tick marks the estimate.
 */
export function PredictionRange({
  prediction,
  max,
  compact = false,
  className,
}: PredictionRangeProps) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / Math.max(max, 1e-9)) * 100))}%`;
  const label = `${formatPoints(prediction.points)} predicted points, plausible range ${formatPoints(prediction.low)} to ${formatPoints(prediction.high)}`;
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <div
        className="bg-surface-3 relative h-2 min-w-16 flex-1 rounded-full"
        role="img"
        aria-label={label}
      >
        <div
          className="bg-secondary/35 absolute inset-y-0 rounded-full"
          style={{ left: pct(prediction.low), right: `calc(100% - ${pct(prediction.high)})` }}
        />
        <div
          className="bg-secondary absolute -top-0.5 h-3 w-1 -translate-x-1/2 rounded-full"
          style={{ left: pct(prediction.points) }}
        />
      </div>
      {compact ? null : (
        <span aria-hidden className="tabular text-muted shrink-0 text-xs">
          <span className="text-text font-semibold">{formatPoints(prediction.points)}</span> (
          {formatPoints(prediction.low)}–{formatPoints(prediction.high)})
        </span>
      )}
    </div>
  );
}

import { Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface InjuryNudgeProps {
  /** One-line version for tight spaces. */
  compact?: boolean;
  className?: string;
}

/**
 * The honesty nudge (PROMPT.md §2): the model can't see same-week team news, and a
 * single gameweek is mostly noise. Keep this visible near every recommendation.
 */
export function InjuryNudge({ compact = false, className }: InjuryNudgeProps) {
  if (compact) {
    return (
      <p className={cn('text-muted flex items-center gap-1.5 text-xs', className)}>
        <Stethoscope aria-hidden className="text-info h-3.5 w-3.5 shrink-0" />
        Check team news before the deadline — the model can't see late injuries.
      </p>
    );
  }
  return (
    <aside
      aria-label="Before you confirm"
      className={cn(
        'border-info/30 bg-info-soft flex gap-3 rounded-lg border px-4 py-3 text-sm',
        className,
      )}
    >
      <Stethoscope aria-hidden className="text-info mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">Sanity-check against team news</p>
        <p className="text-muted mt-0.5">
          The model can&apos;t see same-week injury news or press conferences, and one gameweek is
          mostly luck. Treat this as a season-long edge, not a guarantee.
        </p>
      </div>
    </aside>
  );
}

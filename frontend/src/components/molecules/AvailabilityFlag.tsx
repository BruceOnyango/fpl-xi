import { AlertTriangle, Ban, CheckCircle2 } from 'lucide-react';
import type { PlayerStatus } from '@/lib/api/schemas';
import { availabilityOf, STATUS_LABEL } from '@/lib/fpl/players';
import { cn } from '@/lib/utils/cn';

export interface AvailabilityFlagProps {
  status: PlayerStatus;
  chanceOfPlaying: number | null;
  news?: string;
  /** `icon` for pitch tokens (label goes to sr-only + title). */
  variant?: 'full' | 'icon';
  className?: string;
}

export function AvailabilityFlag({
  status,
  chanceOfPlaying,
  news,
  variant = 'full',
  className,
}: AvailabilityFlagProps) {
  const a = availabilityOf({ status, chanceOfPlaying });
  const Icon = a === 'out' ? Ban : a === 'doubtful' ? AlertTriangle : CheckCircle2;
  const tone = a === 'out' ? 'text-negative' : a === 'doubtful' ? 'text-warning' : 'text-positive';
  const label =
    a === 'doubtful' && chanceOfPlaying !== null
      ? `${chanceOfPlaying}% chance of playing`
      : STATUS_LABEL[status];
  const title = news ? `${label} — ${news}` : label;

  if (variant === 'icon') {
    if (a === 'available') return null;
    return (
      <span title={title} className={cn('inline-flex', tone, className)}>
        <Icon aria-hidden className="h-3.5 w-3.5" />
        <span className="sr-only">{title}</span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-w-0 items-start gap-1.5 text-xs', className)}>
      <Icon aria-hidden className={cn('mt-px h-3.5 w-3.5 shrink-0', tone)} />
      <span className="min-w-0">
        <span className={cn('font-semibold', tone)}>{label}</span>
        {news ? <span className="text-muted block">{news}</span> : null}
      </span>
    </span>
  );
}

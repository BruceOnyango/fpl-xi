import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeTone =
  'neutral' | 'accent' | 'secondary' | 'positive' | 'negative' | 'warning' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3 text-muted',
  accent: 'bg-accent-soft text-accent-text',
  secondary: 'bg-secondary-soft text-secondary-text',
  positive: 'bg-positive-soft text-positive',
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-2xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tracking-wide uppercase',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

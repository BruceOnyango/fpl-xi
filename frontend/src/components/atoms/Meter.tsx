import { cn } from '@/lib/utils/cn';

export interface MeterProps {
  /** 0–max */
  value: number;
  max?: number;
  label: string;
  tone?: 'accent' | 'warning' | 'negative' | 'secondary';
  className?: string;
}

const tones = {
  accent: 'bg-accent',
  warning: 'bg-warning',
  negative: 'bg-negative',
  secondary: 'bg-secondary',
};

/** Horizontal bar with native meter semantics. */
export function Meter({ value, max = 100, label, tone = 'accent', className }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('bg-surface-3 h-1.5 w-full overflow-hidden rounded-full', className)}
    >
      <div className={cn('h-full rounded-full', tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

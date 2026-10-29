import { cn } from '@/lib/utils/cn';

export interface SpinnerProps {
  /** Announced to screen readers. */
  label?: string;
  className?: string;
}

export function Spinner({ label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <span
        aria-hidden
        className="border-border border-t-accent h-4 w-4 animate-spin rounded-full border-2"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

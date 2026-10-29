import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Small supporting line under the value (range, context). */
  hint?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
}

/** Label + big number. Uses <dl> semantics so screen readers pair them. */
export function Stat({ label, value, hint, size = 'md', className }: StatProps) {
  return (
    <dl className={cn('min-w-0', className)}>
      <dt className="text-muted text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd
        className={cn(
          'tabular font-display mt-1 leading-none font-bold',
          size === 'lg' ? 'text-3xl' : 'text-2xl',
        )}
      >
        {value}
      </dd>
      {hint ? <dd className="text-muted mt-1 text-xs">{hint}</dd> : null}
    </dl>
  );
}

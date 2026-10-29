import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

/** Placeholder block. Size it like the content it stands in for, to avoid layout shift (§13). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('bg-surface-3 animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

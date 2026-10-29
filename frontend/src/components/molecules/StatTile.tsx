import type { ReactNode } from 'react';
import { Card, Delta, Skeleton, Stat, type DeltaProps } from '@/components/atoms';
import { cn } from '@/lib/utils/cn';

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: DeltaProps;
  /** Decorative icon shown top-right. */
  icon?: ReactNode;
  loading?: boolean;
  tone?: 'default' | 'accent';
  className?: string;
}

/** KPI tile: label, big value, optional delta and hint. */
export function StatTile({
  label,
  value,
  hint,
  delta,
  icon,
  loading = false,
  tone = 'default',
  className,
}: StatTileProps) {
  return (
    <Card
      as="div"
      className={cn(
        'relative overflow-hidden p-4',
        tone === 'accent' && 'border-accent/40 from-accent-soft to-surface bg-gradient-to-br',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="text-muted absolute top-4 right-4">
          {icon}
        </span>
      ) : null}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      ) : (
        <>
          <Stat
            label={label}
            value={value}
            hint={
              delta || hint ? (
                <span className="flex flex-wrap items-center gap-2">
                  {delta ? <Delta {...delta} /> : null}
                  {hint}
                </span>
              ) : undefined
            }
          />
        </>
      )}
    </Card>
  );
}

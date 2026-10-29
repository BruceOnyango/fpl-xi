import { AlertOctagon, Inbox, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/atoms';
import { cn } from '@/lib/utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** The next action — empty states always offer one (§6.7). */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
      <span
        aria-hidden
        className="bg-surface-3 text-muted flex h-11 w-11 items-center justify-center rounded-full"
      >
        {icon ?? <Inbox className="h-5 w-5" />}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="text-muted mx-auto mt-1 max-w-sm text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  /** Human message — ApiError messages are written for people. */
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}
    >
      <span
        aria-hidden
        className="bg-negative-soft text-negative flex h-11 w-11 items-center justify-center rounded-full"
      >
        <AlertOctagon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted mx-auto mt-1 max-w-sm text-sm">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden className="h-3.5 w-3.5" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Minimal shape of a TanStack Query result, so this molecule stays fetch-agnostic. */
export interface QueryLike {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
}

export interface QueryStateProps {
  query: QueryLike;
  /** Layout-matching skeleton (preferred over a spinner, §6.7). */
  loading: ReactNode;
  isEmpty?: boolean;
  empty?: ReactNode;
  children: ReactNode;
}

/** Routes a query to loading / error / empty / content. Every async surface uses this. */
export function QueryState({ query, loading, isEmpty = false, empty, children }: QueryStateProps) {
  if (query.isPending) return <div aria-busy="true">{loading}</div>;
  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.message ?? 'Unknown error.'}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (isEmpty) return <>{empty ?? <EmptyState title="Nothing to show yet" />}</>;
  return <>{children}</>;
}

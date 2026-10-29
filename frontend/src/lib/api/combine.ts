/** Merge several TanStack Query results into one loading/error/refetch handle for QueryState. */
import type { UseQueryResult } from '@tanstack/react-query';

export interface CombinedQuery {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function combineQueries(...queries: UseQueryResult<unknown, Error>[]): CombinedQuery {
  const failed = queries.find((q) => q.isError);
  return {
    // A disabled query is "pending" forever; only count ones that are actually fetching or due to.
    isPending: queries.some((q) => q.isPending && q.fetchStatus !== 'idle'),
    isError: failed !== undefined,
    error: failed?.error ?? null,
    refetch: () => {
      for (const q of queries) if (q.isError || q.isStale) void q.refetch();
    },
  };
}

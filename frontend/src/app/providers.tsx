import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { SettingsProvider } from '@/lib/settings';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't retry what won't change (404s, contract bugs); retry flaky network twice.
        retry: (count, err) => !(err instanceof ApiError && err.kind !== 'network') && count < 2,
        // Polite to the (unofficial) upstream: no refetch storms on tab focus.
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

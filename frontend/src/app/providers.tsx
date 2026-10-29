import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useState, type ReactNode } from 'react';
import { isTransient } from '@/lib/api/client';
import { SettingsProvider } from '@/lib/settings';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry only transient failures (network, gateway 502/504 during an API restart), twice.
        retry: (count, err) => isTransient(err) && count < 2,
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

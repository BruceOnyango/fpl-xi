import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider, type Settings } from '@/lib/settings';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  settings?: Partial<Settings>;
}

/** Render with fresh QueryClient, router and settings — what organisms/pages need. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', settings, ...rest }: Options = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SettingsProvider initial={settings}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </SettingsProvider>
      </QueryClientProvider>
    );
  }
  return { client, ...render(ui, { wrapper: Wrapper, ...rest }) };
}

import type { Decorator, Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '../src/lib/settings';
import '../src/styles/index.css';

/** Providers organisms expect, plus the mock API so data-fetching stories work. */
function ThemeSync({ theme }: { theme: 'light' | 'dark' }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}

const withProviders: Decorator = (Story, ctx) => {
  const theme = (ctx.globals.theme as 'light' | 'dark' | undefined) ?? 'dark';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <SettingsProvider initial={{ theme, teamId: 8350133 }}>
        <MemoryRouter>
          <ThemeSync theme={theme} />
          <div className="bg-bg text-text min-h-[200px] p-4">
            <Story />
          </div>
        </MemoryRouter>
      </SettingsProvider>
    </QueryClientProvider>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  loaders: [
    async () => {
      const { worker } = await import('../src/mocks/browser');
      await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
      return {};
    },
  ],
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['dark', 'light'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i } },
  },
};
export default preview;

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import PlayersPage from './PlayersPage';

describe('PlayersPage', () => {
  // jsdom has no layout; size the virtualised table's scroll container.
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 1200,
    });
  });
  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
  });

  it('filters from the URL and shows an empty state', async () => {
    const { container } = renderWithProviders(<PlayersPage />, { route: '/players?pos=FWD' });
    expect(await screen.findByText(/^\d+ of \d+ players$/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'FWD' })).toBeChecked();

    // The comparison flow (URL-driven checkboxes) is covered in e2e/flows.spec.ts: in jsdom the
    // MemoryRouter search-param update doesn't commit for this virtualised table.
    expect(screen.getAllByRole('checkbox', { name: /^Compare / }).length).toBeGreaterThan(0);
    await expectNoA11yViolations(container);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search players' }), 'zzzzqq');
    expect(await screen.findByText('No players match')).toBeInTheDocument();
  });
});

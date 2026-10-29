import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { expectNoA11yViolations } from '@/test/axe';
import { DEMO_TEAM } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it('asks for a team ID when none is set, then loads the recommended XI', async () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Add your FPL team ID to get your recommended XI')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Or try a demo team' }));
    const pitch = await screen.findByRole('region', { name: 'Recommended starting eleven' });
    expect(within(pitch).getAllByRole('group')).toHaveLength(11);
  });

  it('renders the full dashboard for a manager, with freshness and honesty cues', async () => {
    const { container } = renderWithProviders(<DashboardPage />, {
      settings: { teamId: DEMO_TEAM },
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: `Mock XI #${DEMO_TEAM}` }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'Recommended starting eleven' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Captaincy' })).toBeInTheDocument();
    expect(screen.getAllByText(/Data pulled/).length).toBeGreaterThan(0);
    expect(screen.getByText(/can't see late injuries/)).toBeInTheDocument();
    expect(screen.getAllByText('Mock data').length).toBeGreaterThan(0);
    await expectNoA11yViolations(container);
  });

  it('shows a human error with retry when the squad fails to load', async () => {
    renderWithProviders(<DashboardPage />, { settings: { teamId: 404 } });
    expect(await screen.findByRole('alert')).toHaveTextContent('FPL has no record of that ID');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('degrades gracefully when the API breaks its contract', async () => {
    server.use(http.get('*/managers/:id/squad', () => HttpResponse.json({ nope: true })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<DashboardPage />, { settings: { teamId: 1 } });
    expect(await screen.findByRole('alert')).toHaveTextContent('unexpected shape');
  });
});

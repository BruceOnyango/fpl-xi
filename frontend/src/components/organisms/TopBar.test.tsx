import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('toggles theme and prompts for a team ID', async () => {
    const { container } = renderWithProviders(<TopBar />, { settings: { theme: 'light' } });
    expect(screen.getByRole('link', { name: 'Add team ID' })).toHaveAttribute('href', '/settings');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(await screen.findByText(/GW \d+ deadline/)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('opens the mobile navigation drawer', async () => {
    renderWithProviders(<TopBar />, { settings: { teamId: 1 } });
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});

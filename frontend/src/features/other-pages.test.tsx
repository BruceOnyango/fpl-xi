/** Smoke + a11y tests for the smaller feature pages. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { DEMO_TEAM } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import FixturesPage from './fixtures/FixturesPage';
import LeaguesPage from './leagues/LeaguesPage';
import MyTeamPage from './my-team/MyTeamPage';
import SettingsPage from './settings/SettingsPage';

describe('MyTeamPage', () => {
  it('shows the pitch and the selected player card', async () => {
    const { container } = renderWithProviders(<MyTeamPage />, { settings: { teamId: DEMO_TEAM } });
    const tokens = await screen.findAllByRole('button', { name: /predicted points/ });
    expect(tokens.length).toBe(15);
    await userEvent.click(tokens[0]!);
    expect(tokens[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('article')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe('FixturesPage', () => {
  it('renders the ticker with a key and span control', async () => {
    const { container } = renderWithProviders(<FixturesPage />);
    expect(await screen.findByRole('table', { name: /every club/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '3 GW' }));
    expect(await screen.findAllByRole('columnheader', { name: /^GW \d+$/ })).toHaveLength(3);
    await expectNoA11yViolations(container);
  });
});

describe('LeaguesPage', () => {
  it('shows tabs per league with the viewer highlighted', async () => {
    const { container } = renderWithProviders(<LeaguesPage />, { settings: { teamId: DEMO_TEAM } });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(1);
    expect(screen.getByText('(you)')).toBeInTheDocument();
    await userEvent.click(tabs[1]!);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    await expectNoA11yViolations(container);
  });
});

describe('SettingsPage', () => {
  it('changes theme and forgets the team ID', async () => {
    const { container } = renderWithProviders(<SettingsPage />, {
      settings: { teamId: 42, theme: 'light' },
    });
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Forget team ID' }));
    expect(screen.queryByRole('button', { name: 'Forget team ID' })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

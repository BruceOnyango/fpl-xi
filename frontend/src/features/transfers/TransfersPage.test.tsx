import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { DEMO_TEAM } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import TransfersPage from './TransfersPage';

describe('TransfersPage', () => {
  it('plans a transfer and updates bank, count and legality live', async () => {
    const { container } = renderWithProviders(<TransfersPage />, {
      settings: { teamId: DEMO_TEAM },
    });
    const squad = await screen.findByRole('region', { name: 'Your squad' });
    const sellButtons = within(squad).getAllByRole('button');
    expect(sellButtons).toHaveLength(15);

    await userEvent.click(sellButtons[sellButtons.length - 1]!); // a forward
    const picker = await screen.findByRole('region', { name: /^Replace / });
    const options = within(picker)
      .getAllByRole('button', { name: /^Bring in/ })
      .filter((b) => !(b as HTMLButtonElement).disabled);
    await userEvent.click(options[0]!);

    expect(screen.queryByRole('region', { name: /^Replace / })).not.toBeInTheDocument();
    const plan = screen.getByRole('region', { name: 'Plan' });
    expect(within(plan).getByText(/^1 \/ \d free$/)).toBeInTheDocument();
    expect(within(plan).getByText('Squad is legal')).toBeInTheDocument();
    expect(within(plan).getByRole('button', { name: /^Undo transfer/ })).toBeInTheDocument();
    await expectNoA11yViolations(container);

    await userEvent.click(within(plan).getByRole('button', { name: 'Reset' }));
    expect(within(plan).getByText('No transfers yet')).toBeInTheDocument();
  });

  it('prompts for a team ID first', () => {
    renderWithProviders(<TransfersPage />);
    expect(screen.getByText('Load your squad to plan transfers')).toBeInTheDocument();
  });
});

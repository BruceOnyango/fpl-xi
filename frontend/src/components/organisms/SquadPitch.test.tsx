import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { squadView } from '@/test/fixtures';
import { SquadPitch } from './SquadPitch';

describe('SquadPitch', () => {
  const view = squadView();

  it('renders eleven starters with captain and vice, plus the bench', async () => {
    const { container } = render(
      <SquadPitch
        starters={view.starters}
        bench={view.bench}
        captainId={view.lineup.captainId}
        viceCaptainId={view.lineup.viceCaptainId}
      />,
    );
    const pitch = screen.getByRole('region', { name: 'Starting eleven' });
    expect(within(pitch).getAllByRole('group')).toHaveLength(11);
    expect(within(pitch).getByRole('group', { name: /, captain$/ })).toBeInTheDocument();
    expect(within(pitch).getByRole('group', { name: /vice-captain$/ })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Bench' })).getAllByRole('group'),
    ).toHaveLength(4);
    await expectNoA11yViolations(container);
  });

  it('makes players selectable by keyboard when onSelectPlayer is given', async () => {
    const onSelect = vi.fn();
    render(
      <SquadPitch
        starters={view.starters}
        bench={[]}
        captainId={view.lineup.captainId}
        viceCaptainId={view.lineup.viceCaptainId}
        onSelectPlayer={onSelect}
      />,
    );
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(
      view.starters.find((s) => s.player.position === 'GK')?.player.id,
    );
  });
});

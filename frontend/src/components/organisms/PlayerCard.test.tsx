import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { teamShort, topPlayers } from '@/test/fixtures';
import { PlayerCard } from './PlayerCard';

describe('PlayerCard', () => {
  it('shows profile stats and can be removed', async () => {
    const p = topPlayers(1)[0]!;
    const onRemove = vi.fn();
    const { container } = render(
      <PlayerCard
        player={p}
        teamShort={teamShort}
        predictionMax={20}
        horizonLabel="next GW"
        onRemove={onRemove}
      />,
    );
    expect(screen.getByRole('article', { name: p.webName })).toBeInTheDocument();
    expect(screen.getByText('Total pts').nextSibling).toHaveTextContent(String(p.totalPoints));
    await userEvent.click(
      screen.getByRole('button', { name: `Remove ${p.webName} from comparison` }),
    );
    expect(onRemove).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });
});

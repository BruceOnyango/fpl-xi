import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { teamShort, topPlayers } from '@/test/fixtures';
import { FlaggedPlayers } from './FlaggedPlayers';

describe('FlaggedPlayers', () => {
  it('lists flagged players with their status', async () => {
    const [a, b] = topPlayers(2);
    const players = [
      { ...a!, status: 'i' as const, chanceOfPlaying: 0, news: 'Hamstring' },
      { ...b!, status: 'a' as const, chanceOfPlaying: null },
    ];
    const { container } = render(<FlaggedPlayers players={players} teamShort={teamShort} />);
    expect(screen.getByText(a!.webName)).toBeInTheDocument();
    expect(screen.queryByText(b!.webName)).not.toBeInTheDocument();
    expect(screen.getByText('Injured')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('shows a reassuring empty state', () => {
    const players = topPlayers(3).map((p) => ({
      ...p,
      status: 'a' as const,
      chanceOfPlaying: null,
    }));
    render(<FlaggedPlayers players={players} teamShort={teamShort} />);
    expect(screen.getByText('No flags in your squad')).toBeInTheDocument();
  });
});

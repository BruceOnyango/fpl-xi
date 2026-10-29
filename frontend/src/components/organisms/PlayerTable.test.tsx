import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { teamShort, topPlayers } from '@/test/fixtures';
import { PlayerTable } from './PlayerTable';

describe('PlayerTable', () => {
  const players = topPlayers(8);

  // jsdom has no layout; give the virtualiser's scroll container a real size.
  const originals = {
    h: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
    w: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
  };
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
    if (originals.h) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originals.h);
    if (originals.w) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originals.w);
  });

  it('sorts by predicted desc by default and toggles sort from header buttons', async () => {
    const { container } = render(
      <PlayerTable players={players} teamShort={teamShort} caption="Players" />,
    );
    const header = screen.getByRole('columnheader', { name: /Predicted/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');
    const firstRow = () => screen.getAllByRole('row')[1]!;
    expect(firstRow()).toHaveTextContent(players[0]!.webName);

    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /Price/ })).getByRole('button'),
    );
    const priciest = [...players].sort((a, b) => b.price - a.price)[0]!;
    expect(firstRow()).toHaveTextContent(priciest.webName);
    await expectNoA11yViolations(container);
  });

  it('limits the comparison set', async () => {
    const onToggle = vi.fn();
    render(
      <PlayerTable
        players={players}
        teamShort={teamShort}
        caption="Players"
        compareIds={new Set([players[0]!.id, players[1]!.id])}
        compareLimit={2}
        onToggleCompare={onToggle}
      />,
    );
    expect(screen.getByRole('checkbox', { name: `Compare ${players[0]!.webName}` })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: `Compare ${players[2]!.webName}` })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: `Compare ${players[1]!.webName}` }));
    expect(onToggle).toHaveBeenCalledWith(players[1]!.id);
  });
});

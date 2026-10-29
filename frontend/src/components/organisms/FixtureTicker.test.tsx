import { render, screen, within } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { allTeams, fixturesFrom } from '@/test/fixtures';
import { FixtureTicker } from './FixtureTicker';

describe('FixtureTicker', () => {
  const fixtures = fixturesFrom(10, 3);

  it('is a captioned table with one row per team and a column per GW', async () => {
    const { container } = render(
      <FixtureTicker
        teams={allTeams}
        fixtures={fixtures}
        fromGw={10}
        toGw={12}
        caption="Test ticker"
      />,
    );
    const table = screen.getByRole('table', { name: 'Test ticker' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Team', 'GW 10', 'GW 11', 'GW 12', 'Avg']);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(allTeams.length);
    await expectNoA11yViolations(container);
  });

  it('sorts by easiest run and marks highlighted clubs', () => {
    const first = allTeams[0]!;
    render(
      <FixtureTicker
        teams={allTeams}
        fixtures={fixtures}
        fromGw={10}
        toGw={12}
        sortByEase
        highlight={new Set([first.id])}
        caption="t"
      />,
    );
    const avgs = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => Number(r.lastElementChild?.textContent));
    expect(avgs).toEqual([...avgs].sort((a, b) => a - b));
    expect(screen.getByText('(in your squad)', { exact: false })).toBeInTheDocument();
  });

  it('shows blanks when a team has no fixture', () => {
    render(
      <FixtureTicker
        teams={allTeams.slice(0, 1)}
        fixtures={[]}
        fromGw={10}
        toGw={10}
        caption="t"
      />,
    );
    expect(screen.getByText('Blank')).toBeInTheDocument();
  });
});

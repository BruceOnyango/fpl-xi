import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { DEMO_TEAM, league } from '@/test/fixtures';
import { LeagueTable } from './LeagueTable';

describe('LeagueTable', () => {
  it('ranks entries and marks the viewer', async () => {
    const l = league();
    const { container } = render(<LeagueTable league={l} selfEntryId={DEMO_TEAM} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(l.entries.length);
    expect(rows[0]).toHaveTextContent(l.entries[0]!.teamName);
    expect(screen.getByText('(you)').closest('tr')).toHaveAttribute('aria-current', 'true');
    await expectNoA11yViolations(container);
  });
});

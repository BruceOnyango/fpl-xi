import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { squadView } from '@/test/fixtures';
import { CaptaincyPanel } from './CaptaincyPanel';

describe('CaptaincyPanel', () => {
  it('ranks options by single-GW points and badges the captain', async () => {
    const view = squadView(6);
    const { container } = render(
      <CaptaincyPanel
        candidates={view.captainPool}
        captainId={view.lineup.captainId}
        viceCaptainId={view.lineup.viceCaptainId}
        limit={3}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    const top = [...view.captainPool].sort((a, b) => b.oneGw.points - a.oneGw.points)[0]!;
    expect(items[0]).toHaveTextContent(top.player.webName);
    expect(screen.getByText('Captain')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

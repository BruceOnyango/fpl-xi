import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { DeadlineCountdown } from './index';

const NOW = new Date('2026-10-30T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe('DeadlineCountdown', () => {
  it('renders a timer with an accessible summary', async () => {
    const { container } = render(
      <DeadlineCountdown
        gw={10}
        deadline={new Date(NOW.getTime() + 26 * 3_600_000).toISOString()}
        now={NOW}
      />,
    );
    expect(screen.getByRole('timer')).toHaveAccessibleName(
      '1 days 2 hours 0 minutes until the gameweek 10 deadline',
    );
    await expectNoA11yViolations(container);
  });
  it('says when the deadline has passed', () => {
    render(<DeadlineCountdown gw={9} deadline={hoursAgo(1)} now={NOW} />);
    expect(screen.getByText('Deadline passed')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { StatTile } from './index';

describe('StatTile', () => {
  it('renders value and delta, or a skeleton while loading', async () => {
    const { container, rerender } = render(
      <StatTile label="Last GW" value="54" delta={{ value: 6, digits: 0 }} />,
    );
    expect(container).toHaveTextContent('Last GW54+6');
    await expectNoA11yViolations(container);
    rerender(<StatTile label="Last GW" value="54" loading />);
    expect(screen.queryByText('54')).not.toBeInTheDocument();
  });
});

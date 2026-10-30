import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { BanRiskFlag } from './index';

describe('BanRiskFlag', () => {
  it('warns players one booking from a ban', async () => {
    const { container } = render(<BanRiskFlag yellowCards={4} oneYellowFromBan />);
    expect(container).toHaveTextContent('One yellow from a ban');
    expect(container).toHaveTextContent('On 4 yellow cards');
    await expectNoA11yViolations(container);
  });
  it('icon variant keeps the warning for screen readers', () => {
    const { getByTitle } = render(<BanRiskFlag yellowCards={9} oneYellowFromBan variant="icon" />);
    expect(getByTitle(/one more booking means a suspension/)).toHaveTextContent('9 yellow cards');
  });
  it('compact variant shows a short visible label', () => {
    const { container } = render(
      <BanRiskFlag yellowCards={4} oneYellowFromBan variant="compact" />,
    );
    expect(container).toHaveTextContent('1 yellow from ban');
  });
  it('renders nothing when not at risk', () => {
    const { container } = render(<BanRiskFlag yellowCards={3} oneYellowFromBan={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

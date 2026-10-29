import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { AvailabilityFlag } from './index';

describe('AvailabilityFlag', () => {
  it('labels doubtful players with their chance', async () => {
    const { container } = render(<AvailabilityFlag status="d" chanceOfPlaying={50} news="Knock" />);
    expect(container).toHaveTextContent('50% chance of playingKnock');
    await expectNoA11yViolations(container);
  });
  it('icon variant renders nothing for available players', () => {
    const { container } = render(
      <AvailabilityFlag status="a" chanceOfPlaying={null} variant="icon" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

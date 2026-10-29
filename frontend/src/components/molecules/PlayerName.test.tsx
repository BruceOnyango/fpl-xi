import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { PlayerName } from './index';

describe('PlayerName', () => {
  it('shows name, club and position', async () => {
    const { container } = render(
      <PlayerName name="Saka" teamShort="ARS" position="MID" meta="£10.1m" />,
    );
    expect(container).toHaveTextContent('SakaMIDARS·£10.1m');
    await expectNoA11yViolations(container);
  });
});

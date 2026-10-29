import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { PitchPlayer } from './index';

describe('PitchPlayer', () => {
  it('is a pressable button when selectable', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <PitchPlayer
        name="Saka"
        teamShort="ARS"
        position="MID"
        predicted={5.6}
        armband="C"
        onSelect={onSelect}
      />,
    );
    const btn = screen.getByRole('button', {
      name: 'Saka, ARS MID, 5.6 predicted points, captain',
    });
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });
});

describe('PitchPlayer (ruled out)', () => {
  it('marks ruled-out players in text and without opacity', async () => {
    const { container } = render(
      <PitchPlayer name="Jesus" teamShort="ARS" position="FWD" predicted={0} dimmed />,
    );
    expect(screen.getByRole('group', { name: /ruled out$/ })).toBeInTheDocument();
    expect(container.querySelector('.opacity-55')).toBeNull();
    await expectNoA11yViolations(container);
  });
});

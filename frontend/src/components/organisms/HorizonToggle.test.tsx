import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { HorizonToggle, horizonLabel } from './HorizonToggle';

describe('HorizonToggle', () => {
  it('switches the horizon setting', async () => {
    const { container } = renderWithProviders(<HorizonToggle />);
    expect(screen.getByRole('radio', { name: '1 GW' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '6 GW' }));
    expect(screen.getByRole('radio', { name: '6 GW' })).toBeChecked();
    await expectNoA11yViolations(container);
  });

  it('labels horizons in words', () => {
    expect(horizonLabel(1)).toBe('next GW');
    expect(horizonLabel(6)).toBe('next 6 GWs');
  });
});

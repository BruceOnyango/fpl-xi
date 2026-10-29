import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { Meter } from './Meter';

describe('Meter', () => {
  it('exposes value semantics', async () => {
    const { container } = render(<Meter value={50} label="Chance of playing" />);
    expect(screen.getByRole('meter', { name: 'Chance of playing' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    await expectNoA11yViolations(container);
  });
});

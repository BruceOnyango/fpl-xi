import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expectNoA11yViolations } from '@/test/axe';
import { SegmentedControl } from './index';

describe('SegmentedControl', () => {
  function Harness() {
    const [v, setV] = useState<1 | 3 | 6>(1);
    return (
      <SegmentedControl
        label="Horizon"
        value={v}
        onChange={setV}
        options={[
          { value: 1, label: '1 GW' },
          { value: 3, label: '3 GW' },
          { value: 6, label: '6 GW' },
        ]}
      />
    );
  }
  it('is a radio group operable with arrow keys', async () => {
    const { container } = render(<Harness />);
    const one = screen.getByRole('radio', { name: '1 GW' });
    expect(one).toBeChecked();
    one.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '3 GW' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3 GW' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: '6 GW' })).toBeChecked();
    await expectNoA11yViolations(container);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { GameweekSelector } from './index';

describe('GameweekSelector', () => {
  it('steps within bounds', async () => {
    const onChange = vi.fn();
    const { container } = render(<GameweekSelector gw={1} max={38} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Previous gameweek' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next gameweek' }));
    expect(onChange).toHaveBeenCalledWith(2);
    await expectNoA11yViolations(container);
  });
});

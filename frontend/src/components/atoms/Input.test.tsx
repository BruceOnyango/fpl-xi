import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { Input } from './Input';

describe('Input', () => {
  it('accepts typing and flags invalid', async () => {
    const { container } = render(<Input aria-label="Team ID" invalid />);
    const input = screen.getByRole('textbox', { name: 'Team ID' });
    await userEvent.type(input, '123');
    expect(input).toHaveValue('123');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await expectNoA11yViolations(container);
  });
});

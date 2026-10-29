import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { Delta } from './Delta';

describe('Delta', () => {
  it('shows a sign with the number', async () => {
    const { container } = render(<Delta value={-2.04} unit="pts" />);
    expect(container).toHaveTextContent('−2.0pts');
    await expectNoA11yViolations(container);
  });

  it('treats lower as better when inverted', () => {
    const { container } = render(<Delta value={-5} invert />);
    expect(container.firstChild).toHaveClass('text-positive');
  });
});

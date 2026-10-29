import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('announces its label', async () => {
    const { container } = render(<Spinner label="Loading squad" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading squad');
    await expectNoA11yViolations(container);
  });
});

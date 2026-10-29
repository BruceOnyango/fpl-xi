import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { Stat } from './Stat';

describe('Stat', () => {
  it('pairs label and value in a description list', async () => {
    const { container } = render(<Stat label="Bank" value="£1.5m" hint="after transfers" />);
    expect(screen.getByRole('term')).toHaveTextContent('Bank');
    expect(screen.getAllByRole('definition')[0]).toHaveTextContent('£1.5m');
    await expectNoA11yViolations(container);
  });
});

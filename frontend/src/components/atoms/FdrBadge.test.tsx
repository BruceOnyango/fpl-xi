import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { FdrBadge } from './FdrBadge';

describe('FdrBadge', () => {
  it('always shows the number and a descriptive title', async () => {
    const { container } = render(<FdrBadge difficulty={5} />);
    expect(container).toHaveTextContent('Difficulty 5');
    expect(container.firstChild).toHaveAttribute('title', 'Difficulty 5: Very hard');
    await expectNoA11yViolations(container);
  });
});

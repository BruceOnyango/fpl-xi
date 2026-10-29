import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { PriceTag } from './PriceTag';

describe('PriceTag', () => {
  it('formats £m with an accessible prefix', async () => {
    const { container } = render(<PriceTag price={4.5} />);
    expect(container).toHaveTextContent('Price £4.5m');
    await expectNoA11yViolations(container);
  });
});

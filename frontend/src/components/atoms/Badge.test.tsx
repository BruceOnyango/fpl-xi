import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its text', async () => {
    const { container } = render(<Badge tone="warning">Stale</Badge>);
    expect(screen.getByText('Stale')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

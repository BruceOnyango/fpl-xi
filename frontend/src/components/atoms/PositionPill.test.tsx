import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { PositionPill } from './PositionPill';

describe('PositionPill', () => {
  it('shows the abbreviation with its full name as title', async () => {
    const { container } = render(<PositionPill position="DEF" />);
    expect(screen.getByText('DEF')).toHaveAttribute('title', 'Defender');
    await expectNoA11yViolations(container);
  });
});

import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { InjuryNudge } from './index';

describe('InjuryNudge', () => {
  it('is a labelled complementary note', async () => {
    const { container } = render(<InjuryNudge />);
    expect(screen.getByRole('complementary', { name: 'Before you confirm' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

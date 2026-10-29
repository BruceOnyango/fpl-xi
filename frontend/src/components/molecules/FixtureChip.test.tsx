import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { FixtureChip } from './index';

describe('FixtureChip', () => {
  it('announces venue and difficulty in text', async () => {
    const { container } = render(<FixtureChip opponentShort="LIV" home={false} difficulty={4} />);
    expect(container).toHaveTextContent('LIV(A)');
    expect(screen.getByText('away, difficulty 4 of 5')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

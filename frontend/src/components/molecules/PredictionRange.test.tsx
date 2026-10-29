import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { PredictionRange } from './index';

describe('PredictionRange', () => {
  it('describes the range for screen readers', async () => {
    const { container } = render(
      <PredictionRange prediction={{ points: 6.2, low: 2, high: 11 }} max={12} />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      '6.2 predicted points, plausible range 2.0 to 11.0',
    );
    await expectNoA11yViolations(container);
  });
});

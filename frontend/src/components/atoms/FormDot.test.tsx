import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { FormDot, formTier } from './FormDot';

describe('FormDot', () => {
  it('maps form to tiers', () => {
    expect(formTier(7)).toBe('hot');
    expect(formTier(3)).toBe('steady');
    expect(formTier(2.9)).toBe('cold');
  });

  it('carries a text label, not just colour', async () => {
    const { container } = render(<FormDot form={1.5} />);
    expect(screen.getByText('Cold form:')).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

import { render } from '@testing-library/react';
import { Avatar, initials } from './Avatar';

describe('Avatar', () => {
  it('derives initials', () => {
    expect(initials('Erling Haaland')).toBe('EH');
    expect(initials('Rodri')).toBe('R');
    expect(initials('  ')).toBe('?');
  });

  it('is decorative', () => {
    const { container } = render(<Avatar name="Bukayo Saka" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

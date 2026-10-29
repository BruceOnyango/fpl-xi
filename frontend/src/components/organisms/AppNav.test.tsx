import { screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { AppNav, NAV_ITEMS } from './AppNav';

describe('AppNav', () => {
  it('lists every section and marks the current one', async () => {
    const { container } = renderWithProviders(<AppNav />, { route: '/players' });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('a')).toHaveLength(NAV_ITEMS.length);
    expect(screen.getByRole('link', { name: 'Players' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    await expectNoA11yViolations(container);
  });
});

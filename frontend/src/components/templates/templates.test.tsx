import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { AppShell } from './AppShell';
import { PageLayout, SplitPaneLayout } from './PageLayout';

describe('templates', () => {
  it('AppShell provides landmarks and a skip link', async () => {
    const { container } = render(
      <AppShell
        sidebar={<nav aria-label="Main">nav</nav>}
        topBar={<header>top</header>}
        footer={<footer>foot</footer>}
      >
        <PageLayout title="Dashboard">content</PageLayout>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('SplitPaneLayout keeps main before aside in reading order', () => {
    const { container } = render(<SplitPaneLayout main={<p>main</p>} aside={<p>aside</p>} />);
    expect(container.textContent).toBe('mainaside');
  });
});

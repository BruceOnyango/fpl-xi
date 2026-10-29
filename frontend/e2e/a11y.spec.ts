/**
 * Real-browser accessibility sweep: every route, both themes, WCAG 2.1 AA — including
 * colour contrast, which jsdom can't check (PROMPT.md §7).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { withTeam } from './helpers';

// Relative to baseURL (/fantasy-league/), so the deployed sub-path is what's tested.
const ROUTES = [
  './',
  './my-team',
  './transfers',
  './players',
  './fixtures',
  './leagues',
  './settings',
];

for (const theme of ['dark', 'light'] as const) {
  for (const route of ROUTES) {
    test(`${route} has no a11y violations (${theme})`, async ({ page }) => {
      await withTeam(page, undefined, theme);
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Recharts' SVG internals are covered by the aria description + table fallback.
        .exclude('.recharts-wrapper')
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
    });
  }
}

import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Fail the test on any axe violation. Colour contrast is skipped here because jsdom
 * can't compute styles; it's checked in real browsers by the Playwright a11y spec.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}

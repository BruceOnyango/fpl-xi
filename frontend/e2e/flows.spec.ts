import { expect, test } from '@playwright/test';
import { withTeam } from './helpers';

test('first visit: connect a demo team and see the recommended XI', async ({ page }) => {
  await withTeam(page, null);
  await page.goto('./');
  await page.getByRole('button', { name: 'Or try a demo team' }).click();
  const pitch = page.getByRole('region', { name: 'Recommended starting eleven' });
  await expect(pitch.getByRole('group')).toHaveCount(11);
  await expect(page.getByText(/can't see late injuries/)).toBeVisible();
  await expect(page.getByText(/Data pulled/).first()).toBeVisible();
});

test('players: compare two players side by side via the URL', async ({ page }) => {
  await withTeam(page);
  await page.goto('./players?pos=FWD');
  const boxes = page.getByRole('checkbox', { name: /^Compare / });
  // Controlled by the URL: state commits after the router's transition, so click then assert.
  await boxes.nth(0).click();
  await expect(boxes.nth(0)).toBeChecked();
  await boxes.nth(1).click();
  await expect(boxes.nth(1)).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Comparing 2' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page).toHaveURL(/cmp=\d+%2C\d+/);
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(2);
});

test('transfers: plan a move and see the plan update', async ({ page }) => {
  await withTeam(page);
  await page.goto('./transfers');
  const squad = page.getByRole('region', { name: 'Your squad' });
  await squad.getByRole('button').last().click();
  const picker = page.getByRole('region', { name: /^Replace / });
  await picker
    .getByRole('button', { name: /^Bring in/ })
    .and(page.locator(':enabled'))
    .first()
    .click();
  const plan = page.getByRole('region', { name: 'Plan' });
  await expect(plan.getByText(/^1 \/ \d free$/)).toBeVisible();
  await expect(plan.getByText('Squad is legal')).toBeVisible();
  await expect(page).toHaveURL(/t=\d+-\d+/);
});

test('keyboard: skip link and nav are operable without a mouse', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'sidebar nav is a drawer on mobile');
  await withTeam(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByRole('link', { name: 'Fixtures' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeVisible();
});

test('mobile: navigation drawer', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'mobile only');
  await withTeam(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Leagues' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Leagues' })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
});

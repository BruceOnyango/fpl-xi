import type { Page } from '@playwright/test';

export const DEMO_TEAM = 8350133;

/** Seed settings before the app boots (skips the team-ID prompt). */
export async function withTeam(
  page: Page,
  teamId: number | null = DEMO_TEAM,
  theme: 'light' | 'dark' = 'dark',
) {
  await page.addInitScript(
    ([id, t]) => {
      localStorage.setItem('fpl-xi:settings', JSON.stringify({ teamId: id, theme: t, horizon: 1 }));
    },
    [teamId, theme] as const,
  );
}

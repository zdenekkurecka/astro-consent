import { test, expect } from '@playwright/test';
import { clearConsent, expectBannerVisible, getConsentState } from './helpers';

test.describe('View Transitions', () => {
  test('consent persists across SPA navigation', async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();

    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);

    await page.locator('nav a[href="/about"]').click();
    await expect(page).toHaveURL('/about');

    await expectBannerVisible(page, false);

    const state = await getConsentState(page);
    expect(state).not.toBeNull();
    expect(state.categories.analytics).toBe(true);
  });

  test('banner does not re-appear after SPA navigation', async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();

    await page.locator('[data-cc=reject-all]').click();
    await expectBannerVisible(page, false);

    await page.locator('nav a[href="/about"]').click();
    await expect(page).toHaveURL('/about');
    await page.locator('nav a[href="/"]').click();
    await expect(page).toHaveURL('/');

    await expectBannerVisible(page, false);
  });

  test('banner shows on every page for first-time visitor', async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();

    await expectBannerVisible(page, true);

    await page.locator('nav a[href="/about"]').click();
    await expect(page).toHaveURL('/about');

    await expectBannerVisible(page, true);
  });
});

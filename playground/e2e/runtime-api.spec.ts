import { test, expect } from '@playwright/test';
import { clearConsent, expectBannerVisible, getConsentAPI } from './helpers';

test.describe('Runtime API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('get() returns null before consent', async ({ page }) => {
    const state = await getConsentAPI(page);
    expect(state).toBeNull();
  });

  test('set() creates initial consent from defaults', async ({ page }) => {
    await page.evaluate(() => {
      window.astroConsent?.set({ analytics: true });
    });

    const state = await getConsentAPI(page);
    expect(state).not.toBeNull();
    expect(state!.categories.analytics).toBe(true);
    expect(state!.categories.marketing).toBe(false);
    expect(state!.categories.essential).toBe(true);

    await expectBannerVisible(page, false);
  });

  test('reset() clears consent and re-shows banner', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);

    await page.evaluate(() => window.astroConsent?.reset());

    const state = await getConsentAPI(page);
    expect(state).toBeNull();
    await expectBannerVisible(page, true);
  });

  test('show() displays the banner', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);

    await page.evaluate(() => window.astroConsent?.show());
    await expectBannerVisible(page, true);
  });

  test('showPreferences() opens the modal', async ({ page }) => {
    await page.evaluate(() => window.astroConsent?.showPreferences());
    const modal = page.locator('#cc-modal');
    await expect(modal).toHaveClass(/cc-visible/);
  });
});

import { test, expect } from '@playwright/test';
import { clearConsent } from './helpers';

test.describe('Revocation of a previously-granted category', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scripts');
    await clearConsent(page);
    await page.reload();
  });

  test('activated script tag remains on revoke; fresh load stays inert', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    await expect(page.locator('#inline-marker')).toHaveAttribute('data-loaded', 'true');
    expect(await page.evaluate(() => (window as any).__ccInlineLoaded)).toBe(true);

    const activatedAnalytics = page.locator(
      'script[data-cc-activated="true"][data-cc-category="analytics"]',
    );
    const activatedCountBefore = await activatedAnalytics.count();
    expect(activatedCountBefore).toBeGreaterThan(0);

    await page.evaluate(() => window.astroConsent?.showPreferences());
    await page.locator('label.cc-toggle:has([data-cc-category=analytics])').click();
    await page.locator('[data-cc=save-preferences]').click();

    const stateAfterRevoke = await page.evaluate(() => window.astroConsent?.get());
    expect(stateAfterRevoke?.categories.analytics).toBe(false);

    await expect(activatedAnalytics).toHaveCount(activatedCountBefore);
    expect(await page.evaluate(() => (window as any).__ccInlineLoaded)).toBe(true);

    await page.reload();

    await expect(page.locator('#cc-banner')).not.toHaveClass(/cc-visible/);

    expect(await page.evaluate(() => (window as any).__ccInlineLoaded)).toBeUndefined();
    await expect(page.locator('#inline-marker')).toHaveAttribute('data-loaded', 'false');

    await expect(
      page.locator('script[type="text/plain"][data-cc-category="analytics"]'),
    ).toHaveCount(2);
    await expect(
      page.locator('script[data-cc-activated="true"][data-cc-category="analytics"]'),
    ).toHaveCount(0);
  });
});

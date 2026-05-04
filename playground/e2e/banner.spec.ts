import { test, expect } from '@playwright/test';
import { clearConsent, expectBannerVisible } from './helpers';

test.describe('Banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('shows banner on first visit (no stored consent)', async ({ page }) => {
    await expectBannerVisible(page, true);
  });

  test('banner has accept, reject, and manage buttons', async ({ page }) => {
    await expect(page.locator('[data-cc=accept-all]')).toBeVisible();
    await expect(page.locator('[data-cc=reject-all]')).toBeVisible();
    await expect(page.locator('[data-cc=manage]')).toBeVisible();
  });

  test('banner does not show when valid consent exists', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();
    await page.reload();
    await expectBannerVisible(page, false);
  });

  test('cookie policy link is rendered', async ({ page }) => {
    const link = page.locator('.cc-banner .cc-policy-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/cookie-policy');
    await expect(link).toHaveText('Cookie Policy');
  });

  test('publishes --cc-banner-height while visible and clears it on dismiss', async ({ page }) => {
    await expectBannerVisible(page, true);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--cc-banner-height').trim(),
        ),
      )
      .toMatch(/^\d+(\.\d+)?px$/);

    const heightPx = await page.evaluate(() =>
      parseFloat(document.documentElement.style.getPropertyValue('--cc-banner-height')),
    );
    expect(heightPx).toBeGreaterThan(0);

    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--cc-banner-height'),
        ),
      )
      .toBe('');
  });
});

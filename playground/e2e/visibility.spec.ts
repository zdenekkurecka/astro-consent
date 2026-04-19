import { test, expect } from '@playwright/test';
import {
  clearConsent,
  expectBannerVisible,
  expectModalVisible,
  openBanner,
  sel,
} from './helpers';

test.describe('Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('shows banner on first visit (no stored consent)', async ({ page }) => {
    await expectBannerVisible(page, true);
  });

  test('banner does not show when valid consent exists', async ({ page }) => {
    await page.locator(sel.acceptAll()).click();
    await page.reload();
    await expectBannerVisible(page, false);
  });

  test('manage opens modal and hides banner', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await expectModalVisible(page, true);
    await expectBannerVisible(page, false);
  });

  test('close button closes modal', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await expectModalVisible(page, true);

    await page.locator(sel.close()).click();
    await expectModalVisible(page, false);
  });

  test('backdrop click closes modal', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await expectModalVisible(page, true);

    // `.cc-modal` spans the full viewport and sits above the overlay, so
    // a click near the corner lands on the modal wrapper itself.
    await page.locator(sel.modal()).click({ position: { x: 5, y: 5 } });
    await expectModalVisible(page, false);
  });

  test('closing modal without consent re-shows banner', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await page.keyboard.press('Escape');
    await expectBannerVisible(page, true);
  });

  test('cookie policy link is rendered in the banner', async ({ page }) => {
    const link = page.locator(sel.banner()).locator(sel.policyLink());
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/cookie-policy');
    await expect(link).toHaveText('Cookie Policy');
  });

  test('openBanner() fixture opens the default layout', async ({ page }) => {
    const { banner, accept } = await openBanner(page);
    await expect(banner).toHaveClass(/cc-visible/);
    await expect(accept).toBeVisible();
  });
});

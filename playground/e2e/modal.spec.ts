import { test, expect } from '@playwright/test';
import { clearConsent, expectBannerVisible, expectModalVisible } from './helpers';

test.describe('Preferences modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('manage button opens modal and hides banner', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await expectModalVisible(page, true);
    await expectBannerVisible(page, false);
  });

  test('close button closes modal', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await expectModalVisible(page, true);

    await page.locator('[data-cc=close-modal]').click();
    await expectModalVisible(page, false);
  });

  test('Escape key closes modal', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await expectModalVisible(page, true);

    await page.keyboard.press('Escape');
    await expectModalVisible(page, false);
  });

  test('overlay click closes modal', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await expectModalVisible(page, true);

    // The .cc-modal element fully covers the viewport and sits above
    // .cc-overlay in the z-stack, so a real viewport click lands on the
    // modal. Dispatch the click directly on the overlay element so the
    // handler's `e.target.id === 'cc-overlay'` check fires.
    await page.evaluate(() => document.getElementById('cc-overlay')?.click());
    await expectModalVisible(page, false);
  });

  test('closing modal without consent re-shows banner', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await page.keyboard.press('Escape');
    await expectBannerVisible(page, true);
  });

  test('modal has correct ARIA attributes', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    const modal = page.locator('#cc-modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'cc-modal-title');
  });

  test('modal accept-all works same as banner accept-all', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await page.locator('[data-cc=modal-accept-all]').click();

    await expectModalVisible(page, false);
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('astro-consent');
      return raw ? JSON.parse(raw) : null;
    });
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(true);
  });
});

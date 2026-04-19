import { test, expect } from '@playwright/test';
import { clearConsent, expectBannerVisible, expectModalVisible, sel } from './helpers';

test.describe('Keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('Escape closes the modal', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await expectModalVisible(page, true);

    await page.keyboard.press('Escape');
    await expectModalVisible(page, false);
  });

  // Single-layer mode collapses banner+modal onto one surface (#44); Escape
  // should then dismiss the banner as well. Not yet implemented.
  test.fixme('Escape closes banner in single-layer mode (#44)', async ({ page }) => {
    await expectBannerVisible(page, true);
    await page.keyboard.press('Escape');
    await expectBannerVisible(page, false);
  });

  test('Space/Enter toggles a category switch', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await expectModalVisible(page, true);
    const analytics = page.locator(sel.switch('analytics'));

    // `locator.press` focuses then presses, which avoids the race with the
    // modal's rAF-based initial-focus hand-off. `page.keyboard.press` alone
    // would sometimes fire while focus was still on the close button.
    await expect(analytics).not.toBeChecked();
    await analytics.press('Space');
    await expect(analytics).toBeChecked();
    await analytics.press('Enter');
    await expect(analytics).not.toBeChecked();
  });

  test('Tab trap keeps focus inside modal', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await expectModalVisible(page, true);

    // Tab repeatedly and confirm focus never escapes the modal container.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const insideModal = await page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        return modal ? modal.contains(document.activeElement) : false;
      }, sel.modal());
      expect(insideModal).toBe(true);
    }
  });
});

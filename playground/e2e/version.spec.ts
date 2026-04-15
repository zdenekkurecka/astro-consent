import { test } from '@playwright/test';
import { clearConsent, expectBannerVisible } from './helpers';

test.describe('Versioned consent', () => {
  test('banner re-appears when stored version < config version', async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();

    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);

    await page.evaluate(() => {
      const raw = localStorage.getItem('astro-consent');
      if (raw) {
        const state = JSON.parse(raw);
        state.version = 0;
        localStorage.setItem('astro-consent', JSON.stringify(state));
      }
    });

    await page.reload();
    await expectBannerVisible(page, true);
  });
});

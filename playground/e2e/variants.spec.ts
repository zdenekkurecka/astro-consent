import { test, expect } from '@playwright/test';
import { expectBannerVisible, openBanner } from './helpers';

// Variant matrix smoke tests (#39, #44, #77, #79). Any variant that is not
// yet implemented passes `openBanner(…)` through and falls back to the
// default layout — the spec still renders a banner, and the feature PR can
// flip the `test.fixme` to a hard assertion when ready.

test.describe('Variants', () => {
  for (const layout of ['bar', 'box', 'cloud', 'popup'] as const) {
    test(`${layout}: accept-all closes the banner`, async ({ page }) => {
      const { accept } = await openBanner(page, { layout });
      await accept.click();
      // The banner uses aria-hidden + class toggle rather than display:none,
      // so assert via the helper (which checks both) instead of `toBeHidden`.
      await expectBannerVisible(page, false);
    });
  }

  test('URL params are echoed onto <html> for feature code to consume', async ({ page }) => {
    await openBanner(page, {
      layout: 'box',
      categoriesOnBanner: true,
      showCounter: true,
      equalWeight: true,
    });
    const attrs = await page.evaluate(() => ({
      layout: document.documentElement.getAttribute('data-cc-test-layout'),
      categoriesOnBanner: document.documentElement.getAttribute(
        'data-cc-test-categories-on-banner',
      ),
      showCounter: document.documentElement.getAttribute('data-cc-test-show-counter'),
      equalWeight: document.documentElement.getAttribute('data-cc-test-equal-weight'),
    }));
    expect(attrs).toEqual({
      layout: 'box',
      categoriesOnBanner: 'true',
      showCounter: 'true',
      equalWeight: 'true',
    });
  });

  test.fixme('categoriesOnBanner renders toggles inline on the banner (#44)', async ({ page }) => {
    const { banner } = await openBanner(page, { categoriesOnBanner: true });
    await expect(banner.locator('[data-cc-category="analytics"]')).toBeVisible();
  });

  test.fixme('showCounter renders the cookie counter (#79)', async ({ page }) => {
    await openBanner(page, { showCounter: true });
    await expect(page.locator('[data-testid="cc-counter"]')).toBeVisible();
  });
});

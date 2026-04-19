import { test, expect } from '@playwright/test';
import { expectBannerVisible, getConsentState, openBanner, sel } from './helpers';

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

  test.describe('categoriesOnBanner (#44)', () => {
    test('renders the toggles inline and skips modal injection', async ({ page }) => {
      const { banner, modal } = await openBanner(page, {
        categoriesOnBanner: true,
        layout: 'cloud',
      });
      // Switches live on the banner, not the modal.
      await expect(banner.locator(sel.toggleLabel('analytics'))).toBeAttached();
      await expect(banner.locator(sel.toggleLabel('marketing'))).toBeAttached();
      // Modal is skipped entirely — no #cc-modal element in the DOM.
      await expect(modal).toHaveCount(0);
      // Banner starts collapsed.
      await expect(banner).toHaveAttribute('data-cc-expanded', 'false');
    });

    test('Customize toggles the expanded state', async ({ page }) => {
      const { banner, manage } = await openBanner(page, {
        categoriesOnBanner: true,
        layout: 'cloud',
      });
      await manage.click();
      await expect(banner).toHaveAttribute('data-cc-expanded', 'true');
      await manage.click();
      await expect(banner).toHaveAttribute('data-cc-expanded', 'false');
    });

    test('expanded primary button saves the current toggle selection', async ({ page }) => {
      const { banner, manage, accept } = await openBanner(page, {
        categoriesOnBanner: true,
        layout: 'cloud',
      });
      await manage.click(); // expand
      // Flip the analytics switch on, leave marketing off.
      await banner.locator(sel.toggleLabel('analytics')).click();
      await accept.click(); // primary morphs to "Save preferences"
      await expectBannerVisible(page, false);
      const state = await getConsentState(page);
      expect(state?.categories).toMatchObject({
        essential: true,
        analytics: true,
        marketing: false,
      });
    });

    test('collapsed accept-all still grants every category', async ({ page }) => {
      const { accept } = await openBanner(page, {
        categoriesOnBanner: true,
        layout: 'cloud',
      });
      await accept.click(); // collapsed → behaves like accept-all
      await expectBannerVisible(page, false);
      const state = await getConsentState(page);
      expect(state?.categories).toMatchObject({
        essential: true,
        analytics: true,
        marketing: true,
      });
    });

    test('dismiss hides the banner without recording consent', async ({ page }) => {
      const { banner } = await openBanner(page, {
        categoriesOnBanner: true,
        layout: 'cloud',
      });
      await banner.locator('[data-cc="dismiss"]').click();
      await expectBannerVisible(page, false);
      const state = await getConsentState(page);
      expect(state).toBeNull();
    });

    test('showPreferences() flips the banner into expanded mode', async ({ page }) => {
      const { banner, modal } = await openBanner(page, {
        categoriesOnBanner: true,
        layout: 'cloud',
      });
      await page.evaluate(() => window.astroConsent?.showPreferences());
      await expect(banner).toHaveAttribute('data-cc-expanded', 'true');
      // No modal exists to fall back to.
      await expect(modal).toHaveCount(0);
    });
  });

  test.fixme('showCounter renders the cookie counter (#79)', async ({ page }) => {
    await openBanner(page, { showCounter: true });
    await expect(page.locator('[data-testid="cc-counter"]')).toBeVisible();
  });
});

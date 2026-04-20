import { test, expect } from '@playwright/test';
import {
  expectBannerVisible,
  expectModalVisible,
  openBanner,
  sel,
} from './helpers';

/**
 * Dismiss confirmation flow (#78). Accept / Reject / Save animate the
 * banner or modal out and spawn a short success toast instead of snapping
 * the surface hidden.
 *
 * These specs assert user-visible behaviour — toast headline, animation
 * class progression, double-click guard — rather than exact timings.
 * Playwright's auto-waiting retries the class / visibility asserts for
 * up to 5s, which comfortably spans the 220ms lead-in + 500ms collapse.
 *
 * The toast shows the action headline only; a detail line (cookie count)
 * will be reintroduced in v0.5 once the library knows individual cookies
 * per category — the current "number of granted categories" is vanity
 * and was deliberately removed.
 */
test.describe('Dismiss confirmation', () => {
  test('accept-all: banner collapses and toast announces "All cookies accepted"', async ({
    page,
  }) => {
    const { banner, accept } = await openBanner(page);

    await accept.click();

    // Stage 1: `cc-confirming` lands immediately on click, blocking further
    // interaction. `cc-visible` stays on until the animation finishes.
    await expect(banner).toHaveClass(/cc-confirming/);

    // Toast appears with the configured headline.
    const toast = page.locator(sel.toast());
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('All cookies accepted');

    // Banner eventually drops `cc-visible` and returns to aria-hidden.
    await expectBannerVisible(page, false);
  });

  test('reject-all: toast reads "Only essential cookies"', async ({ page }) => {
    const { reject } = await openBanner(page);

    await reject.click();

    const toast = page.locator(sel.toast());
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Only essential cookies');
  });

  test('save-preferences (modal): toast reads "Preferences saved"', async ({
    page,
  }) => {
    const { manage, save } = await openBanner(page);
    await manage.click();
    await expectModalVisible(page, true);

    // Flip analytics on, leave marketing off.
    await page.locator(sel.toggleLabel('analytics')).click();
    await save.click();

    const toast = page.locator(sel.toast());
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Preferences saved');

    await expectModalVisible(page, false);
  });

  test('single-layer save: accept-all while expanded shows "Preferences saved"', async ({
    page,
  }) => {
    const { banner, manage, accept } = await openBanner(page, {
      categoriesOnBanner: true,
      layout: 'cloud',
    });
    await manage.click(); // expand
    await banner.locator(sel.toggleLabel('analytics')).click();
    await accept.click(); // primary morphs to Save preferences

    const toast = page.locator(sel.toast());
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Preferences saved');

    await expectBannerVisible(page, false);
  });

  test('double-click during confirm is ignored (guard)', async ({ page }) => {
    const { accept } = await openBanner(page);

    // Two rapid clicks; the second must not spawn a second toast or re-run
    // the animation. `force` + `noWaitAfter` bypass actionability checks so
    // the second click fires even though `cc-confirming` disables pointer
    // events — mirrors a racing real-world double-click.
    await accept.click();
    await accept.click({ force: true, noWaitAfter: true });

    const toasts = page.locator(sel.toast());
    await expect(toasts).toHaveCount(1);
  });

  test('toast auto-dismisses within ~3.5s', async ({ page }) => {
    const { accept } = await openBanner(page);
    await accept.click();

    const toast = page.locator(sel.toast());
    await expect(toast).toBeVisible();
    // 0.5s in + 2.1s hold + 0.4s out = 3s; give a small buffer.
    await expect(toast).toHaveCount(0, { timeout: 4000 });
  });

  test('prefers-reduced-motion: dismiss still settles and toast still appears', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      const { accept } = await openBanner(page);
      await accept.click();

      // Reduced-motion replaces the collapse with a 150ms fade, but the
      // state machine still runs — `cc-confirming` lands and the banner
      // ultimately hides.
      await expect(page.locator(sel.toast())).toBeVisible();
      await expectBannerVisible(page, false);
    } finally {
      await context.close();
    }
  });
});

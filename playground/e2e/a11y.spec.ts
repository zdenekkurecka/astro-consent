import { test, expect } from '@playwright/test';
import { clearConsent, expectBannerVisible, sel } from './helpers';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('modal has dialog semantics', async ({ page }) => {
    await page.locator(sel.manage()).click();
    const modal = page.locator(sel.modal());
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'cc-modal-title');
  });

  test('banner aria-hidden flips when the banner is hidden', async ({ page }) => {
    const banner = page.locator(sel.banner());
    await expect(banner).toHaveAttribute('aria-hidden', 'false');

    await page.locator(sel.acceptAll()).click();
    await expect(banner).toHaveAttribute('aria-hidden', 'true');
    await expectBannerVisible(page, false);
  });

  test('banner carries a region label so screen readers can announce it', async ({ page }) => {
    const banner = page.locator(sel.banner());
    await expect(banner).toHaveAttribute('role', 'region');
    await expect(banner).toHaveAttribute('aria-label', /cookie/i);
  });

  // Focus management after dismissal is a known gap — the runtime hides the
  // banner via aria-hidden + class toggle but leaves activeElement on the
  // clicked button, which now sits inside an aria-hidden subtree. Fix in
  // the dismiss-flow PR (#78).
  test.fixme('reject-all lands focus somewhere sensible after the banner dismisses (#78)', async ({ page }) => {
    await page.locator(sel.rejectAll()).click();
    // Banner is hidden; focus must not linger on an aria-hidden=true node.
    const focusedInsideHiddenBanner = await page.evaluate((selector) => {
      const banner = document.querySelector(selector);
      const active = document.activeElement as HTMLElement | null;
      if (!banner || !active) return false;
      return (
        banner.getAttribute('aria-hidden') === 'true' &&
        banner.contains(active) &&
        active !== document.body
      );
    }, sel.banner());
    expect(focusedInsideHiddenBanner).toBe(false);
  });
});

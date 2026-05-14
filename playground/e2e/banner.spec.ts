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

  test('toggles `inert` alongside aria-hidden so axe `aria-hidden-focus` passes', async ({
    page,
  }) => {
    const banner = page.locator('#cc-banner');
    await expectBannerVisible(page, true);
    await expect(banner).not.toHaveAttribute('inert', /.*/);

    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);
    await expect(banner).toHaveAttribute('inert', /.*/);

    const acceptFocusable = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>('[data-cc=accept-all]');
      btn?.focus();
      return document.activeElement === btn;
    });
    expect(acceptFocusable).toBe(false);
  });

  test('dismissing the banner moves focus out before applying aria-hidden', async ({ page }) => {
    await expectBannerVisible(page, true);

    // Spy on the banner's own setAttribute to capture whether focus was still
    // inside the subtree at the exact instant `aria-hidden="true"` was applied.
    // The bug left the just-clicked button focused there, which hides a focused
    // node from assistive tech ("Blocked aria-hidden … descendant retained
    // focus"). `inert` blurs it one line later, so checking focus *after*
    // hideBanner() can't catch the regression — only this instant can.
    await page.evaluate(() => {
      const banner = document.getElementById('cc-banner')!;
      const original = banner.setAttribute.bind(banner);
      (window as Window & { __focusInBannerAtHide?: boolean }).__focusInBannerAtHide = undefined;
      banner.setAttribute = (name: string, value: string) => {
        if (name === 'aria-hidden' && value === 'true') {
          (window as Window & { __focusInBannerAtHide?: boolean }).__focusInBannerAtHide =
            !!document.activeElement && banner.contains(document.activeElement);
        }
        return original(name, value);
      };
    });

    // A real click focuses the button; that's the precondition for the bug.
    await page.locator('[data-cc=accept-all]').click();
    await expectBannerVisible(page, false);

    const focusInBannerAtHide = await page.evaluate(
      () => (window as Window & { __focusInBannerAtHide?: boolean }).__focusInBannerAtHide,
    );
    expect(focusInBannerAtHide).toBe(false);
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

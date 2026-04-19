import { test, expect } from '@playwright/test';
import { clearConsent } from './helpers';

test.describe('Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('astro-consent:consent fires on accept-all', async ({ page }) => {
    const eventPromise = page.evaluate(
      () =>
        new Promise<any>((resolve) => {
          document.addEventListener(
            'astro-consent:consent',
            (e: any) => resolve(e.detail),
            { once: true },
          );
        }),
    );

    await page.locator('[data-cc=accept-all]').click();

    const detail = await eventPromise;
    expect(detail.version).toBe(1);
    expect(detail.categories.analytics).toBe(true);
  });

  test('astro-consent:consent fires on page load with existing consent', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    // Register listener before the next navigation so we catch the event
    // fired during init on the fresh page.
    await page.addInitScript(() => {
      (window as any).__consentEventDetail = null;
      document.addEventListener(
        'astro-consent:consent',
        (e: any) => {
          (window as any).__consentEventDetail = e.detail;
        },
        { once: true },
      );
    });

    await page.goto('/about');

    await expect
      .poll(async () => page.evaluate(() => (window as any).__consentEventDetail))
      .not.toBeNull();

    const detail = await page.evaluate(() => (window as any).__consentEventDetail);
    expect(detail.version).toBe(1);
    expect(detail.categories.analytics).toBe(true);
  });

  test('astro-consent:change fires when updating preferences', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    const changePromise = page.evaluate(
      () =>
        new Promise<any>((resolve) => {
          document.addEventListener(
            'astro-consent:change',
            (e: any) => resolve(e.detail),
            { once: true },
          );
        }),
    );

    await page.evaluate(() => window.astroConsent?.showPreferences());
    // Hidden input — click the wrapping label to toggle it off.
    await page.locator('label.cc-toggle:has([data-cc-category=marketing])').click();
    await page.locator('[data-cc=save-preferences]').click();

    const detail = await changePromise;
    expect(detail.categories.marketing).toBe(false);
    expect(detail.categories.analytics).toBe(true);
  });
});

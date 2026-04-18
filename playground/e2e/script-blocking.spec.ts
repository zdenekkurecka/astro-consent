import { test, expect } from '@playwright/test';
import { clearConsent } from './helpers';

test.describe('Declarative script blocking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scripts');
    await clearConsent(page);
    await page.reload();
  });

  test('blocked scripts stay inert before consent', async ({ page }) => {
    // Banner is still up — no category has been granted yet.
    await expect(page.locator('#cc-banner')).toHaveClass(/cc-visible/);

    expect(await page.evaluate(() => (window as any).__ccInlineLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccExternalLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccMarketingLoaded)).toBeUndefined();

    await expect(page.locator('#inline-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#blocked-iframe')).not.toHaveAttribute('src', /.+/);
  });

  test('accept-all activates every blocked resource', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    await expect(page.locator('#inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#ext-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#marketing-marker')).toHaveAttribute('data-loaded', 'true');

    expect(await page.evaluate(() => (window as any).__ccInlineLoaded)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ccExternalLoaded)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ccMarketingLoaded)).toBe(true);

    await expect(page.locator('#blocked-iframe')).toHaveAttribute('src', '/iframe-body.html');
    await expect(page.locator('#blocked-iframe')).toHaveAttribute('data-cc-activated', 'true');
  });

  test('rejected category stays blocked', async ({ page }) => {
    // Accept analytics only via the modal. Marketing should remain blocked.
    await page.locator('[data-cc=manage]').click();
    await page.locator('label.cc-toggle:has([data-cc-category=analytics])').click();
    await page.locator('[data-cc=save-preferences]').click();

    await expect(page.locator('#inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#marketing-marker')).toHaveAttribute('data-loaded', 'false');

    expect(await page.evaluate(() => (window as any).__ccMarketingLoaded)).toBeUndefined();

    // Iframe src must remain empty — marketing was denied.
    const iframeSrc = await page.locator('#blocked-iframe').getAttribute('src');
    expect(iframeSrc ?? '').toBe('');
  });

  test('existing consent activates scripts on reload', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();
    await page.reload();

    // No banner, activation happens via the initial CONSENT event on init.
    await expect(page.locator('#inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#blocked-iframe')).toHaveAttribute('src', '/iframe-body.html');
  });

  test('MutationObserver activates dynamically-inserted scripts', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    await expect(page.locator('#dynamic-marker')).toHaveAttribute('data-loaded', 'false');

    await page.locator('#btn-insert').click();

    await expect(page.locator('#dynamic-marker')).toHaveAttribute('data-loaded', 'true');
    expect(await page.evaluate(() => (window as any).__ccDynamicLoaded)).toBe(true);
  });

  test('dynamically-inserted script stays blocked when category is denied', async ({ page }) => {
    await page.locator('[data-cc=reject-all]').click();

    await page.locator('#btn-insert').click();

    // Give the observer a tick — the placeholder is added but must not run.
    await page.waitForTimeout(100);

    await expect(page.locator('#dynamic-marker')).toHaveAttribute('data-loaded', 'false');
    expect(await page.evaluate(() => (window as any).__ccDynamicLoaded)).toBeUndefined();
  });
});

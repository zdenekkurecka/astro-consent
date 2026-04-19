import { test, expect } from '@playwright/test';
import { clearConsent, sel } from './helpers';

test.describe('Recipe snippets (GA4 / GTM / Meta Pixel)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recipes');
    await clearConsent(page);
    await page.reload();
  });

  test('every recipe stays inert before consent', async ({ page }) => {
    await expect(page.locator(sel.banner())).toHaveClass(/cc-visible/);

    await expect(page.locator('#recipe-ga4-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-ga4-inline-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-gtm-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-metapixel-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-metapixel-inline-marker')).toHaveAttribute('data-loaded', 'false');

    expect(await page.evaluate(() => (window as any).__ccRecipeGA4Loaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccRecipeGA4InlineLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccRecipeGTMLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccRecipeMetaPixelLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccRecipeMetaPixelInlineLoaded)).toBeUndefined();
  });

  test('analytics-only consent loads GA4 and GTM, leaves Meta Pixel blocked', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await page.locator(sel.toggleLabel('analytics')).click();
    await page.locator(sel.savePreferences()).click();

    await expect(page.locator('#recipe-ga4-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#recipe-ga4-inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#recipe-gtm-marker')).toHaveAttribute('data-loaded', 'true');

    await expect(page.locator('#recipe-metapixel-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-metapixel-inline-marker')).toHaveAttribute('data-loaded', 'false');
    expect(await page.evaluate(() => (window as any).__ccRecipeMetaPixelLoaded)).toBeUndefined();
  });

  test('accept-all fires every recipe', async ({ page }) => {
    await page.locator(sel.acceptAll()).click();

    await expect(page.locator('#recipe-ga4-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#recipe-ga4-inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#recipe-gtm-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#recipe-metapixel-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#recipe-metapixel-inline-marker')).toHaveAttribute('data-loaded', 'true');

    expect(await page.evaluate(() => (window as any).__ccRecipeGA4Loaded)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ccRecipeGTMLoaded)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ccRecipeMetaPixelLoaded)).toBe(true);

    // Inline Meta Pixel stub should have queued the init+PageView calls.
    const fbqQueue = await page.evaluate(() => (window as any).fbq?.q?.map((a: any) => Array.from(a)));
    expect(fbqQueue).toEqual([
      ['init', '000000000000000'],
      ['track', 'PageView'],
    ]);
  });

  test('reject-all keeps everything blocked', async ({ page }) => {
    await page.locator(sel.rejectAll()).click();

    await expect(page.locator('#recipe-ga4-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-gtm-marker')).toHaveAttribute('data-loaded', 'false');
    await expect(page.locator('#recipe-metapixel-marker')).toHaveAttribute('data-loaded', 'false');

    expect(await page.evaluate(() => (window as any).__ccRecipeGA4Loaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccRecipeGTMLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccRecipeMetaPixelLoaded)).toBeUndefined();
  });
});

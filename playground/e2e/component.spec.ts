import { test, expect } from '@playwright/test';
import { clearConsent } from './helpers';

test.describe('ConsentScript component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/component');
    await clearConsent(page);
    await page.reload();
  });

  test('renders inert placeholders before consent', async ({ page }) => {
    await expect(page.locator('#cc-banner')).toHaveClass(/cc-visible/);

    expect(await page.evaluate(() => (window as any).__ccComponentInlineLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccComponentExternalLoaded)).toBeUndefined();
    expect(await page.evaluate(() => (window as any).__ccComponentMarketingLoaded)).toBeUndefined();

    // Placeholder <script> tags must still carry the inert type attr so the
    // browser never executes them until the runtime rewrites them.
    const inert = await page.locator('script[type="text/plain"][data-cc-category]').count();
    expect(inert).toBeGreaterThanOrEqual(3);
  });

  test('accept-all activates every gated script', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    await expect(page.locator('#c-inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#c-ext-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#c-marketing-marker')).toHaveAttribute('data-loaded', 'true');

    expect(await page.evaluate(() => (window as any).__ccComponentInlineLoaded)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ccComponentExternalLoaded)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ccComponentMarketingLoaded)).toBe(true);
  });

  test('denied category stays blocked', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await page.locator('label.cc-toggle:has([data-cc-category=analytics])').click();
    await page.locator('[data-cc=save-preferences]').click();

    await expect(page.locator('#c-inline-marker')).toHaveAttribute('data-loaded', 'true');
    await expect(page.locator('#c-marketing-marker')).toHaveAttribute('data-loaded', 'false');

    expect(await page.evaluate(() => (window as any).__ccComponentMarketingLoaded)).toBeUndefined();
  });

  test('passes through script attributes such as async', async ({ page }) => {
    // The marketing ConsentScript is declared with `async`. After activation
    // the forwarded attribute should still be present on the live <script>.
    await page.locator('[data-cc=accept-all]').click();

    await expect(page.locator('#c-marketing-marker')).toHaveAttribute('data-loaded', 'true');

    const hasAsync = await page.evaluate(() => {
      const activated = document.querySelectorAll<HTMLScriptElement>(
        'script[data-cc-activated="true"][data-cc-category="marketing"]',
      );
      return Array.from(activated).some((s) => s.async === true);
    });
    expect(hasAsync).toBe(true);
  });
});

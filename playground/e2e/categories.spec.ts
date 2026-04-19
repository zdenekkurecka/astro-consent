import { test, expect } from '@playwright/test';
import { clearConsent, getConsentState, sel } from './helpers';

test.describe('Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('essential toggle is checked and disabled', async ({ page }) => {
    await page.locator(sel.manage()).click();
    const essential = page.locator(sel.switch('essential'));
    await expect(essential).toBeChecked();
    await expect(essential).toBeDisabled();
  });

  test('non-essential toggles start at their configured defaults', async ({ page }) => {
    await page.locator(sel.manage()).click();
    // Playground configures analytics/marketing with default: false.
    await expect(page.locator(sel.switch('analytics'))).not.toBeChecked();
    await expect(page.locator(sel.switch('marketing'))).not.toBeChecked();
  });

  test('clicking a toggle flips its checked state', async ({ page }) => {
    await page.locator(sel.manage()).click();
    const analytics = page.locator(sel.switch('analytics'));

    await expect(analytics).not.toBeChecked();
    await page.locator(sel.toggleLabel('analytics')).click();
    await expect(analytics).toBeChecked();
  });

  test('toggle state set via UI persists across reload', async ({ page }) => {
    // Backfill coverage (#80): only runtime-api .set() was tested previously.
    // This asserts the same end state through the UI path.
    await page.locator(sel.manage()).click();
    await page.locator(sel.toggleLabel('analytics')).click();
    await page.locator(sel.savePreferences()).click();

    await page.reload();
    const state = await getConsentState(page);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(false);

    // And the toggle reflects the stored state when the modal is reopened.
    await page.evaluate(() => window.astroConsent?.showPreferences());
    await expect(page.locator(sel.switch('analytics'))).toBeChecked();
    await expect(page.locator(sel.switch('marketing'))).not.toBeChecked();
  });
});

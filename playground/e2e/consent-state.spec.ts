import { test, expect } from '@playwright/test';
import {
  clearConsent,
  expectBannerVisible,
  getConsentState,
  getConsentAPI,
} from './helpers';

test.describe('Consent state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('accept all → all categories true', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    const state = await getConsentState(page);
    expect(state).not.toBeNull();
    expect(state.version).toBe(1);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(true);
    expect(state.timestamp).toBeGreaterThan(0);

    await expectBannerVisible(page, false);
  });

  test('reject all → non-essential categories false', async ({ page }) => {
    await page.locator('[data-cc=reject-all]').click();

    const state = await getConsentState(page);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(false);
    expect(state.categories.marketing).toBe(false);

    await expectBannerVisible(page, false);
  });

  test('save preferences → respects individual toggles', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();

    // The real inputs are visually hidden (width/height: 0) so Playwright's
    // check()/uncheck() can't target them directly. Click the wrapping
    // <label class="cc-toggle"> which toggles the input.
    await page.locator('label.cc-toggle:has([data-cc-category=analytics])').click();
    // Marketing default is false, so nothing to uncheck — ensure it stays off
    // by reading the checkbox state without touching it.
    await expect(page.locator('[data-cc-category=marketing]')).not.toBeChecked();

    await page.locator('[data-cc=save-preferences]').click();

    const state = await getConsentState(page);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(false);
  });

  test('essential toggle is always checked and disabled', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    const essential = page.locator('[data-cc-category=essential]');
    await expect(essential).toBeChecked();
    await expect(essential).toBeDisabled();
  });

  test('runtime API matches localStorage', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    const fromStorage = await getConsentState(page);
    const fromAPI = await getConsentAPI(page);

    expect(fromAPI).toEqual(fromStorage);
  });
});

import { test, expect } from '@playwright/test';
import {
  clearConsent,
  expectBannerVisible,
  getConsentState,
  getConsentAPI,
  sel,
} from './helpers';

test.describe('Consent state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('accept all → all categories true', async ({ page }) => {
    await page.locator(sel.acceptAll()).click();

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
    await page.locator(sel.rejectAll()).click();

    const state = await getConsentState(page);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(false);
    expect(state.categories.marketing).toBe(false);

    await expectBannerVisible(page, false);
  });

  test('save preferences → respects individual toggles', async ({ page }) => {
    await page.locator(sel.manage()).click();

    // Each category renders as a [role="switch"] div — clicking it flips
    // aria-checked. Playwright's check()/uncheck() don't drive ARIA switches,
    // so we click through the helper selector.
    await page.locator(sel.toggleLabel('analytics')).click();
    // Marketing default is false, so nothing to uncheck — ensure it stays off
    // by reading the checkbox state without touching it.
    await expect(page.locator(sel.switch('marketing'))).not.toBeChecked();

    await page.locator(sel.savePreferences()).click();

    const state = await getConsentState(page);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(false);
  });

  test('essential toggle is always checked and disabled', async ({ page }) => {
    await page.locator(sel.manage()).click();
    const essential = page.locator(sel.switch('essential'));
    await expect(essential).toBeChecked();
    await expect(essential).toBeDisabled();
  });

  test('runtime API matches localStorage', async ({ page }) => {
    await page.locator(sel.acceptAll()).click();

    const fromStorage = await getConsentState(page);
    const fromAPI = await getConsentAPI(page);

    expect(fromAPI).toEqual(fromStorage);
  });
});

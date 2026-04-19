import { test, expect } from '@playwright/test';
import {
  clearConsent,
  expectBannerVisible,
  expectModalVisible,
  getConsentState,
  sel,
} from './helpers';

test.describe('Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
  });

  test('banner exposes accept, reject, and manage buttons', async ({ page }) => {
    await expect(page.locator(sel.acceptAll())).toBeVisible();
    await expect(page.locator(sel.rejectAll())).toBeVisible();
    await expect(page.locator(sel.manage())).toBeVisible();
  });

  test('accept-all writes all categories true and hides banner', async ({ page }) => {
    await page.locator(sel.acceptAll()).click();
    await expectBannerVisible(page, false);

    const state = await getConsentState(page);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(true);
  });

  test('reject-all writes non-essential categories false and hides banner', async ({ page }) => {
    await page.locator(sel.rejectAll()).click();
    await expectBannerVisible(page, false);

    const state = await getConsentState(page);
    expect(state.categories.essential).toBe(true);
    expect(state.categories.analytics).toBe(false);
    expect(state.categories.marketing).toBe(false);
  });

  test('modal accept-all behaves like banner accept-all', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await page.locator(sel.modalAcceptAll()).click();

    await expectModalVisible(page, false);
    const state = await getConsentState(page);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(true);
  });

  test('save-preferences persists current toggle state', async ({ page }) => {
    await page.locator(sel.manage()).click();
    await page.locator(sel.toggleLabel('analytics')).click();
    await page.locator(sel.savePreferences()).click();

    await expectModalVisible(page, false);
    const state = await getConsentState(page);
    expect(state.categories.analytics).toBe(true);
    expect(state.categories.marketing).toBe(false);
  });
});

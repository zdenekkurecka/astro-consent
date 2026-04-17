import { test, expect, type Page } from '@playwright/test';
import { clearConsent } from './helpers';

/**
 * Collect every entry in `window.dataLayer`, normalizing the `arguments`-shaped
 * objects pushed by the `gtag(...)` helper into plain arrays so Playwright can
 * assert against them.
 */
async function readDataLayer(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const dl = (window as any).dataLayer ?? [];
    return dl.map((entry: any) => {
      if (entry && typeof entry === 'object' && typeof entry.length === 'number') {
        return Array.from(entry);
      }
      return entry;
    });
  });
}

function findConsentCalls(
  entries: unknown[],
  command: 'default' | 'update',
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    if (entry[0] === 'consent' && entry[1] === command && entry[2]) {
      out.push(entry[2] as Record<string, unknown>);
    }
  }
  return out;
}

test.describe('Google Consent Mode v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gcm');
    await clearConsent(page);
    await page.reload();
  });

  test('head-inline snippet sets denied defaults + wait_for_update', async ({ page }) => {
    const entries = await readDataLayer(page);
    const defaults = findConsentCalls(entries, 'default');

    // Global denied defaults + one regional override for US.
    expect(defaults).toHaveLength(2);

    const global = defaults[0];
    expect(global).toMatchObject({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });
    expect(global).not.toHaveProperty('region');

    const usOverride = defaults[1];
    expect(usOverride).toMatchObject({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
      region: ['US'],
    });
  });

  test('ads_data_redaction is forwarded via gtag("set", …)', async ({ page }) => {
    const entries = await readDataLayer(page);
    const setCalls = entries.filter(
      (e): e is unknown[] => Array.isArray(e) && e[0] === 'set',
    );
    const redaction = setCalls.find((c) => c[1] === 'ads_data_redaction');
    expect(redaction?.[2]).toBe(true);
  });

  test('accept-all fires a granted update', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();

    const entries = await readDataLayer(page);
    const updates = findConsentCalls(entries, 'update');
    expect(updates.length).toBeGreaterThanOrEqual(1);

    const last = updates[updates.length - 1];
    expect(last).toEqual({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  });

  test('reject-all fires a denied update', async ({ page }) => {
    await page.locator('[data-cc=reject-all]').click();

    const entries = await readDataLayer(page);
    const updates = findConsentCalls(entries, 'update');
    const last = updates[updates.length - 1];
    expect(last).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });

  test('partial consent via modal grants analytics only', async ({ page }) => {
    await page.locator('[data-cc=manage]').click();
    await page.locator('label.cc-toggle:has([data-cc-category=analytics])').click();
    await page.locator('[data-cc=save-preferences]').click();

    const entries = await readDataLayer(page);
    const updates = findConsentCalls(entries, 'update');
    const last = updates[updates.length - 1];
    expect(last).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
  });

  test('existing consent triggers update on reload', async ({ page }) => {
    await page.locator('[data-cc=accept-all]').click();
    await page.reload();

    const entries = await readDataLayer(page);
    const updates = findConsentCalls(entries, 'update');
    expect(updates.length).toBeGreaterThanOrEqual(1);
    expect(updates[updates.length - 1]).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'granted',
    });
  });
});

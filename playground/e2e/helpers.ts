import { type Page, expect } from '@playwright/test';

export async function clearConsent(page: Page) {
  await page.evaluate(() => localStorage.removeItem('astro-consent'));
}

export async function getConsentState(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('astro-consent');
    return raw ? JSON.parse(raw) : null;
  });
}

export async function getConsentAPI(page: Page) {
  return page.evaluate(() => window.astroConsent?.get() ?? null);
}

export async function waitForConsentEvent(
  page: Page,
  event: 'astro-consent:consent' | 'astro-consent:change',
) {
  return page.evaluate((evt) => {
    return new Promise<any>((resolve) => {
      document.addEventListener(evt, (e: any) => resolve(e.detail), { once: true });
    });
  }, event);
}

export async function expectBannerVisible(page: Page, visible = true) {
  const banner = page.locator('#cc-banner');
  if (visible) {
    await expect(banner).toHaveClass(/cc-visible/);
    await expect(banner).toHaveAttribute('aria-hidden', 'false');
  } else {
    await expect(banner).not.toHaveClass(/cc-visible/);
    await expect(banner).toHaveAttribute('aria-hidden', 'true');
  }
}

export async function expectModalVisible(page: Page, visible = true) {
  const modal = page.locator('#cc-modal');
  if (visible) {
    await expect(modal).toHaveClass(/cc-visible/);
    await expect(modal).toHaveAttribute('aria-hidden', 'false');
  } else {
    await expect(modal).not.toHaveClass(/cc-visible/);
    await expect(modal).toHaveAttribute('aria-hidden', 'true');
  }
}

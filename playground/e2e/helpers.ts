import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Single source of truth for test selectors. Specs must use these helpers
 * instead of inlining `#cc-…` or `[data-cc=…]` strings, so markup churn
 * touches this file only.
 *
 * Convention:
 *   • Anchor surfaces (banner, modal, overlay, toast, counter): `data-testid`.
 *   • Action elements (buttons, toggles): `data-cc=…` / `data-cc-category=…`.
 */
export const sel = {
  banner: () => `[data-testid="cc-banner"]`,
  modal: () => `[data-testid="cc-modal"]`,
  overlay: () => `[data-testid="cc-overlay"]`,
  toast: () => `[data-testid="cc-toast"]`,
  counter: () => `[data-testid="cc-counter"]`,
  acceptAll: () => `[data-cc="accept-all"]`,
  rejectAll: () => `[data-cc="reject-all"]`,
  savePreferences: () => `[data-cc="save-preferences"]`,
  modalAcceptAll: () => `[data-cc="modal-accept-all"]`,
  modalRejectAll: () => `[data-cc="modal-reject-all"]`,
  manage: () => `[data-cc="manage"]`,
  close: () => `[data-cc="close-modal"]`,
  policyLink: () => `[data-cc="policy-link"]`,
  // Scoped to `[role="switch"]` so the selector doesn't collide with
  // `<script data-cc-category>` placeholders used by declarative blocking.
  switch: (category: string) => `[role="switch"][data-cc-category="${category}"]`,
  // The category switch is now a `[role="switch"]` div (#77) with no outer
  // `<label>` wrapper — clicking the switch itself toggles aria-checked.
  // Kept under the `toggleLabel` name so existing specs don't churn; may be
  // renamed in a follow-up.
  toggleLabel: (category: string) => `[role="switch"][data-cc-category="${category}"]`,
};

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
  const banner = page.locator(sel.banner());
  if (visible) {
    await expect(banner).toHaveClass(/cc-visible/);
    await expect(banner).toHaveAttribute('aria-hidden', 'false');
  } else {
    await expect(banner).not.toHaveClass(/cc-visible/);
    await expect(banner).toHaveAttribute('aria-hidden', 'true');
  }
}

export async function expectModalVisible(page: Page, visible = true) {
  const modal = page.locator(sel.modal());
  if (visible) {
    await expect(modal).toHaveClass(/cc-visible/);
    await expect(modal).toHaveAttribute('aria-hidden', 'false');
  } else {
    await expect(modal).not.toHaveClass(/cc-visible/);
    await expect(modal).toHaveAttribute('aria-hidden', 'true');
  }
}

/**
 * Options accepted by {@link openBanner}. They mirror the v0.4 feature matrix
 * — layouts (#39), categories-on-banner (#44), cookie counter (#79) — and
 * become URL query params the playground reads on load. Features not yet
 * implemented still accept the param so variant tests can `test.fixme()`
 * without restructuring.
 */
export interface OpenBannerOptions {
  layout?: 'bar' | 'box' | 'cloud' | 'popup';
  categoriesOnBanner?: boolean;
  showCounter?: boolean;
  equalWeight?: boolean;
}

export interface BannerHandles {
  banner: Locator;
  modal: Locator;
  accept: Locator;
  reject: Locator;
  save: Locator;
  manage: Locator;
  close: Locator;
  toggle: (category: string) => Locator;
}

/**
 * Navigate to the playground with the given harness config applied via URL
 * params, clear any stored consent, and wait for the banner to be rendered.
 * Returns locators for the elements a spec typically interacts with.
 *
 * Variant-specific options (layout, categoriesOnBanner, showCounter, …) are
 * passed through as query params. The playground echoes them back onto
 * `<html data-cc-test-*>` so tests and future feature code can read them
 * without a second round-trip.
 */
export async function openBanner(
  page: Page,
  opts: OpenBannerOptions = {},
): Promise<BannerHandles> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(opts)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  await page.goto(query ? `/?${query}` : '/');
  await clearConsent(page);
  await page.reload();
  await page.waitForSelector(sel.banner());

  return {
    banner: page.locator(sel.banner()),
    modal: page.locator(sel.modal()),
    accept: page.locator(sel.acceptAll()),
    reject: page.locator(sel.rejectAll()),
    save: page.locator(sel.savePreferences()),
    manage: page.locator(sel.manage()),
    close: page.locator(sel.close()),
    toggle: (category: string) => page.locator(sel.toggleLabel(category)),
  };
}

import { test, expect, type Page } from '@playwright/test';
import { clearConsent } from './helpers';

/**
 * Regression guard for the banner layout tokens.
 *
 * `--cc-banner-max-width` and `--cc-banner-text-min-width` replaced two
 * hard-coded values in `.cc-banner-inner` / `.cc-banner-text`. Two things have
 * to keep holding:
 *
 *   1. The defaults render exactly what the literals did, so the change is
 *      invisible to anyone who never sets them.
 *   2. A consumer's plain `:root { --cc-* }` rule wins. That is the whole
 *      point of the token: the package's own default is declared inside
 *      `:where(:root)` at zero specificity, so the override needs no
 *      `!important` and no dependency on `.cc-banner-inner` — a class this
 *      package treats as internal. We therefore override via `addStyleTag`
 *      (a real cascade fight against the injected stylesheet) rather than by
 *      setting an inline style, which would win regardless and prove nothing.
 */

const REM = 16;

/** Widths of the pieces that compete for a row inside `.cc-banner-inner`. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const inner = document.querySelector('.cc-banner-inner') as HTMLElement;
    const text = document.querySelector('.cc-banner-text') as HTMLElement;
    const actions = document.querySelector('.cc-banner-actions') as HTMLElement;
    const cs = getComputedStyle(inner);
    const t = text.getBoundingClientRect();
    const a = actions.getBoundingClientRect();
    return {
      maxWidth: cs.maxWidth,
      width: Math.round(inner.getBoundingClientRect().width),
      padX: parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
      gap: parseFloat(cs.columnGap),
      textMinWidth: getComputedStyle(text).minWidth,
      actions: Math.round(a.width),
      // Flex-wrapped items stack, so the actions start after the text ends
      // only while the two share a row. `align-items: center` makes a
      // top-coordinate comparison unreliable when the text is taller.
      sameRow: a.left >= t.right - 1,
    };
  });
}

test.describe('Banner width tokens', () => {
  // Comfortably above the 480px breakpoint, where `.cc-banner-actions`
  // becomes a full-width grid and the row question stops being meaningful.
  test.use({ viewport: { width: 1600, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearConsent(page);
    await page.reload();
    await expect(page.locator('#cc-banner')).toHaveClass(/cc-visible/);
  });

  test('defaults are unchanged: 72rem cap, 280px text floor', async ({ page }) => {
    const m = await measure(page);
    expect(m.maxWidth).toBe(`${72 * REM}px`);
    expect(m.width).toBe(72 * REM);
    expect(m.textMinWidth).toBe('280px');
  });

  test('a consumer :root rule narrows the bar without !important', async ({ page }) => {
    await page.addStyleTag({ content: ':root { --cc-banner-max-width: 50rem; }' });
    const m = await measure(page);
    expect(m.maxWidth).toBe(`${50 * REM}px`);
    expect(m.width).toBe(50 * REM);
  });

  test('`none` makes the content full-bleed', async ({ page }) => {
    await page.addStyleTag({ content: ':root { --cc-banner-max-width: none; }' });
    const m = await measure(page);
    expect(m.maxWidth).toBe('none');
    // The bar is fixed to both edges, so uncapped content fills the viewport.
    expect(m.width).toBe(1600);
  });

  test('the text floor decides where the actions wrap', async ({ page }) => {
    const base = await measure(page);

    // Pick a bar narrow enough that the message gets less room than the
    // default 280px floor, but more than a lowered one. Derived from the
    // measured button width so the test does not hard-code a value that
    // shifts with the playground's labels or locale.
    const roomForText = 200;
    expect(roomForText).toBeLessThan(280);
    const cap = base.actions + base.gap + roomForText + base.padX;

    await page.addStyleTag({ content: `:root { --cc-banner-max-width: ${cap}px; }` });
    const tight = await measure(page);
    expect(tight.width).toBe(Math.round(cap));
    expect(tight.sameRow, 'default 280px floor should push the actions onto their own row')
      .toBe(false);

    await page.addStyleTag({ content: ':root { --cc-banner-text-min-width: 120px; }' });
    const lowered = await measure(page);
    expect(lowered.textMinWidth).toBe('120px');
    expect(lowered.sameRow, 'lowering the floor should recover the shared row').toBe(true);
  });
});

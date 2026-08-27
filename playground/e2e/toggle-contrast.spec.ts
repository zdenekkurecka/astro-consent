import { test, expect, type Page } from '@playwright/test';
import { clearConsent } from './helpers';

/**
 * Regression guard for #116 — WCAG 2.1 SC 1.4.11 Non-text Contrast.
 *
 * The toggle needs 3:1 for the visual boundaries that identify it as a control
 * and show its state:
 *
 *   - the track against whatever is painted behind it, and
 *   - the knob against the track.
 *
 * The backdrop is *not* `--cc-bg`: the toggle sits inside `.cc-category`, which
 * paints `rgba(var(--cc-tint-rgb), 0.02)` over the modal. Measuring against
 * `--cc-bg` overstates the ratio, so we composite the real stack instead.
 */

const MIN_RATIO = 3;

type Reading = { track: number; knob: number; trackColor: string };

async function readToggleContrast(page: Page, category: string): Promise<Reading> {
  return page.evaluate((key) => {
    type Rgba = { r: number; g: number; b: number; a: number };

    const parse = (value: string): Rgba => {
      const n = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n.length > 3 ? n[3] : 1 };
    };

    const over = (top: Rgba, bottom: Rgba): Rgba => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });

    /** Flatten every translucent background between `el` and the first opaque one. */
    const backdropOf = (el: Element): Rgba => {
      const stack: Rgba[] = [];
      for (let n = el.parentElement; n; n = n.parentElement) {
        const bg = parse(getComputedStyle(n).backgroundColor);
        if (bg.a > 0) stack.push(bg);
        if (bg.a === 1) break;
      }
      // Assume a white canvas under everything, then paint bottom-up.
      let out: Rgba = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
      return out;
    };

    const luminance = ({ r, g, b }: Rgba): number => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };

    const ratio = (a: Rgba, b: Rgba): number => {
      const [x, y] = [luminance(a), luminance(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };

    const input = document.querySelector(`input[data-cc-category="${key}"]`);
    const slider = input?.nextElementSibling;
    if (!slider) throw new Error(`no toggle for category "${key}"`);

    const track = over(parse(getComputedStyle(slider).backgroundColor), backdropOf(slider));
    const knob = over(
      parse(getComputedStyle(slider, '::before').backgroundColor),
      track,
    );

    return {
      track: ratio(track, backdropOf(slider)),
      knob: ratio(knob, track),
      trackColor: getComputedStyle(slider).backgroundColor,
    };
  }, category);
}

/** Resolve a custom property to the `rgb(...)` form `getComputedStyle` reports. */
async function resolveToken(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
}

async function openPreferences(page: Page) {
  await page.goto('/');
  await clearConsent(page);
  await page.reload();

  // `.cc-toggle-slider` animates `background-color` over 0.2s. Contrast is a
  // property of the *resting* states, and sampling mid-interpolation makes the
  // reading depend on machine load — so freeze the transition rather than try
  // to wait it out. (Polling for two equal frames does not work: a transition's
  // start time is the frame it is first sampled on, so the first two samples
  // both read the `from` value and the poll exits at progress 0.)
  await page.addStyleTag({
    content: '.cc-toggle-slider, .cc-toggle-slider::before { transition: none !important; }',
  });

  await page.click('[data-cc="manage"]');
  await expect(page.locator('#cc-modal')).toHaveClass(/cc-visible/);
}

/** `analytics` defaults to false in the playground config, so it renders unchecked. */
function suite(label: string) {
  test(`${label}: off-state toggle clears 3:1 on both boundaries`, async ({ page }) => {
    await openPreferences(page);
    const { track, knob, trackColor } = await readToggleContrast(page, 'analytics');

    expect(trackColor, 'off track should paint --cc-toggle-off').toBe(
      await resolveToken(page, '--cc-toggle-off'),
    );

    expect(track, `off track vs backdrop (${label})`).toBeGreaterThanOrEqual(MIN_RATIO);
    expect(knob, `off knob vs track (${label})`).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  test(`${label}: on-state toggle clears 3:1 on both boundaries`, async ({ page }) => {
    await openPreferences(page);
    await page.click('label.cc-toggle:has(input[data-cc-category="analytics"])');
    await expect(page.locator('input[data-cc-category="analytics"]')).toBeChecked();

    const { track, knob, trackColor } = await readToggleContrast(page, 'analytics');

    // Pin what was actually measured: without this the test can silently
    // re-measure the off state and still pass.
    expect(trackColor, 'on track should paint --cc-primary').toBe(
      await resolveToken(page, '--cc-primary'),
    );

    expect(track, `on track vs backdrop (${label})`).toBeGreaterThanOrEqual(MIN_RATIO);
    expect(knob, `on knob vs track (${label})`).toBeGreaterThanOrEqual(MIN_RATIO);
  });
}

test.describe('Toggle contrast — light palette', () => {
  test.use({ colorScheme: 'light' });
  suite('light');
});

test.describe('Toggle contrast — dark palette', () => {
  // `ui.colorMode: 'auto'` leaves `data-cc-theme` unset, so this drives the
  // `@media (prefers-color-scheme: dark)` block in base.css.
  test.use({ colorScheme: 'dark' });
  suite('dark');
});

# @zdenekkurecka/astro-consent

## 0.4.0

### Minor Changes

- [#86](https://github.com/zdenekkurecka/astro-consent/pull/86) [`e5a51bb`](https://github.com/zdenekkurecka/astro-consent/commit/e5a51bb9693eb294f94f2a5af486cb5839c14796) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Four banner layout variants — `bar`, `box`, `cloud`, `popup` — with configurable position. Default remains `bar` + `bottom`, so existing installations don't shift visually after upgrade.

  ```ts
  cookieConsent({
    version: 1,
    categories: {
      /* ... */
    },
    ui: {
      banner: {
        layout: "box", // 'bar' | 'box' | 'cloud' | 'popup'
        position: "bottom-right",
        scrim: false, // cloud-only passthrough; popup always on, bar/box always off
      },
    },
  });
  ```

  Position validity per layout — invalid combinations fall back to the layout's default and emit a `console.warn` in dev:

  | Layout  | Valid positions                                        |
  | ------- | ------------------------------------------------------ |
  | `bar`   | `top`, `bottom`                                        |
  | `box`   | `top-left`, `top-right`, `bottom-left`, `bottom-right` |
  | `cloud` | `top`, `bottom`                                        |
  | `popup` | `center`                                               |

  New CSS custom properties: `--cc-banner-max-width`, `--cc-box-width`, `--cc-popup-width`, `--cc-banner-offset`. All layouts are driven by `data-cc-layout` / `data-cc-position` / `data-cc-scrim` attributes on the banner root, so consumers can override layouts with their own CSS without forking the integration.

  Closes #39.

- [#87](https://github.com/zdenekkurecka/astro-consent/pull/87) [`ea70f66`](https://github.com/zdenekkurecka/astro-consent/commit/ea70f66ece191ebb7dee501f3b87e4794202f9ff) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Single-layer consent flow: category toggles can now be rendered directly on the banner, eliminating the modal click for sites with few categories.

  ```ts
  cookieConsent({
    version: 1,
    categories: {
      /* ... */
    },
    ui: {
      banner: {
        layout: "cloud",
        categoriesOnBanner: true,
      },
    },
  });
  ```

  The banner starts collapsed. Clicking **Customize** expands it in place, revealing the toggles and morphing the action labels (Customize ↔ Hide preferences, Accept all ↔ Save preferences). The "Reject optional" button fades and collapses to zero width once expanded — it's redundant when the user has direct switch control.

  A new `×` close button (label: `text.dismissAriaLabel`) lets the user dismiss the banner without recording consent; it returns on the next page load.

  `window.astroConsent.showPreferences()` flips the banner into expanded mode instead of opening the modal — the modal is not injected at all in single-layer mode.

  Layout fit:

  | Layout  | Recommended for single-layer? |
  | ------- | ----------------------------- |
  | `cloud` | yes                           |
  | `popup` | yes                           |
  | `bar`   | works, tighter                |
  | `box`   | not recommended (too narrow)  |

  New text keys: `hidePreferences` (default `"Hide preferences"`) and `dismissAriaLabel` (default `"Dismiss"`). Behavior with `categoriesOnBanner: false` is unchanged.

  Closes #44.

- [#83](https://github.com/zdenekkurecka/astro-consent/pull/83) [`7101c11`](https://github.com/zdenekkurecka/astro-consent/commit/7101c1121c4e822ef7cf208372b2889c5b7323bb) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Visual design refresh: layered card surface with backdrop blur, custom switch component, category badges (Required / Optional), and `prefers-reduced-motion` support.

  New design tokens extend the existing palette — `--cc-surface-2`, `--cc-stroke-2`, `--cc-text-dim`, `--cc-text-mute`, `--cc-accent-ink`, `--cc-aura-1`, `--cc-aura-2`, `--cc-radius-sm`, `--cc-radius-xs`, and `--cc-shadow-card` — all shipped as hex (including 8-digit hex for alpha) with light and dark defaults.

  **Changed.** Category toggles now render as `<div role="switch" aria-checked="…" data-cc-category="…">` instead of a hidden `<input type="checkbox">` inside a `<label class="cc-toggle">`. Consumers who deep-style the toggle with `.cc-toggle input[type="checkbox"]` / `.cc-toggle-slider` selectors must migrate to `.cc-switch` / `.cc-switch[aria-checked="true"]`. Keyboard behaviour is preserved: `Space` / `Enter` flip the switch. `aria-disabled="true"` replaces `disabled` on the locked essential category.

  Two new text keys — `text.badgeRequired` (default `"Required"`) and `text.badgeOptional` (default `"Optional"`) — control the category badges. The existing `text.essentialBadge` is now deprecated and kept as a fallback for `badgeRequired` only, so existing configs keep rendering the same label.

### Patch Changes

- [#85](https://github.com/zdenekkurecka/astro-consent/pull/85) [`5ef2b53`](https://github.com/zdenekkurecka/astro-consent/commit/5ef2b539102b473104aed20bbc07861167b451ba) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Internal refactor: derive surface, aura, stroke, text, and primary-hover tokens from three inputs (`--cc-primary`, `--cc-tone`, `--cc-text`) via `color-mix()`. Rebranding the card now touches three tokens instead of ten; every previously shipped token remains overridable as an escape hatch. No visual change and no config surface change.

## 0.3.0

### Minor Changes

- [#69](https://github.com/zdenekkurecka/astro-consent/pull/69) [`35f3f80`](https://github.com/zdenekkurecka/astro-consent/commit/35f3f802182ac94d46aa78fb8aaee25f11dce2d0) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Added `<ConsentScript>` Astro component for category-gated scripts.

  Ship at `@zdenekkurecka/astro-consent/components`, wraps the existing
  `type="text/plain"` + `data-cc-category` markup with a named-prop API that
  the declarative blocking runtime already knows how to activate.

  ```astro
  ---
  import { ConsentScript } from '@zdenekkurecka/astro-consent/components';
  ---

  <!-- External — renders as type="text/plain" with data-cc-src -->
  <ConsentScript
    category="analytics"
    src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
    async
  />

  <!-- Inline — slot content becomes the script body -->
  <ConsentScript category="analytics">
    {`gtag('js', new Date()); gtag('config', 'G-XXX');`}
  </ConsentScript>
  ```

  Any other `<script>` attributes (`defer`, `nonce`, `integrity`, `crossorigin`,
  …) pass through to the placeholder and survive activation. `is:inline` is
  applied automatically so Astro leaves the placeholder markup intact.

  Closes #21.

- [#69](https://github.com/zdenekkurecka/astro-consent/pull/69) [`b1cac4b`](https://github.com/zdenekkurecka/astro-consent/commit/b1cac4b03e0241dcdcbda9607fe62bfad0c1077f) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Declarative script blocking via `data-cc-category` / `data-cc-src`.

  Third-party scripts and embeds can now be gated with markup instead of
  bespoke event listeners. Mark a placeholder with `type="text/plain"` and a
  category — the integration activates it once consent is granted.

  ```astro
  <script
    is:inline
    type="text/plain"
    data-cc-category="analytics"
    data-cc-src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
    async
  ></script>

  <iframe data-cc-category="marketing" data-cc-src="…"></iframe>
  ```

  Supports external scripts (`data-cc-src`), inline bodies, and iframe embeds.
  Covers both the initial scan on `astro-consent:consent` / `:change` and a
  `MutationObserver` for elements inserted after the first scan. All other
  attributes (`async`, `defer`, `nonce`, `integrity`, `crossorigin`, …) flow
  through to the activated script. Activated elements are marked with
  `data-cc-activated="true"`.

  The event-based hook (`document.addEventListener('astro-consent:consent', …)`)
  is still the right choice when you need custom bootstrap or teardown logic;
  the two approaches compose.

  Note: activation is one-way within a page lifecycle — once a tracker runs,
  the integration cannot unload it. Revoking a category stops future loads
  (e.g. after a full reload or on pages that haven't scanned yet) but does
  not tear down already-executed code.

- [#69](https://github.com/zdenekkurecka/astro-consent/pull/69) [`4b97506`](https://github.com/zdenekkurecka/astro-consent/commit/4b97506b2efa6a5277aa2ada9844ce9d0d09c955) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Type-safe category keys via generic config.

  `ConsentConfig`, `ConsentState`, and `ConsentText` now take an optional
  `K extends string` generic that narrows `categories` (and `text.categories`)
  to the literal keys you defined. When you pass a config to `cookieConsent`,
  TypeScript infers `K` from the `categories` map — so typos in downstream
  lookups are caught and autocompletion suggests the right keys.

  ```ts
  const config = {
    version: 1,
    categories: {
      analytics: { label: "Analytics", description: "…", default: false },
      marketing: { label: "Marketing", description: "…", default: false },
    },
  } satisfies ConsentConfig<"analytics" | "marketing">;

  // state.categories.analyitcs → type error, with a "did you mean 'analytics'?" hint
  ```

  The generic defaults to `string`, so existing code keeps compiling unchanged.
  End-to-end typing of the `astro-consent:consent` / `:change` event payload
  and `window.astroConsent` is available via the `ConsentKeys` augmentation
  pattern — see the Events / "Typed category keys" section in the README.

- [#69](https://github.com/zdenekkurecka/astro-consent/pull/69) [`87caa46`](https://github.com/zdenekkurecka/astro-consent/commit/87caa468153ef6c45261ec103fda00a163bad956) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - First-class Google Consent Mode v2 support via a new `googleConsentMode`
  config option.

  When configured, the integration:

  1. Injects an inline snippet at the top of `<head>` that bootstraps
     `window.dataLayer` + `gtag` and calls `gtag('consent', 'default', …)` with
     every mapped signal denied (plus `wait_for_update`).
  2. Bridges `astro-consent:consent` / `astro-consent:change` into
     `gtag('consent', 'update', …)` automatically — a signal is granted only
     when every category that maps to it is granted (AND semantics).
  3. Forwards `adsDataRedaction` / `urlPassthrough` via `gtag('set', …)`.
  4. Emits one additional default per `regions` entry so CCPA-style opt-out
     markets (e.g. `regions: { US: 'granted' }`) start granted.

  ```ts
  cookieConsent({
    version: 1,
    categories: {
      /* … */
    },
    googleConsentMode: {
      mapping: {
        analytics: ["analytics_storage"],
        marketing: ["ad_storage", "ad_user_data", "ad_personalization"],
      },
      waitForUpdate: 500,
      regions: { US: "granted" },
      adsDataRedaction: true,
    },
  });
  ```

  The feature is opt-in; omitting `googleConsentMode` keeps the integration
  strict-CSP-safe. Enabling it requires `script-src` to include
  `'unsafe-inline'` (or a matching hash) because the default snippet must run
  synchronously before any GTM/gtag.js loads.

- [#69](https://github.com/zdenekkurecka/astro-consent/pull/69) [`1dbb0fd`](https://github.com/zdenekkurecka/astro-consent/commit/1dbb0fd6635f2bf7e19ea49d7e99456d33c5f847) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Typed event listeners and runtime API via `ConsentKeys` augmentation.

  Drop a project-level `.d.ts` to make every `astro-consent:consent` /
  `:change` listener and `window.astroConsent` narrow to your declared
  category keys:

  ```ts
  // src/astro-consent.d.ts
  declare module "@zdenekkurecka/astro-consent" {
    interface ConsentKeys {
      analytics: true;
      marketing: true;
    }
  }
  export {};
  ```

  With the augmentation in place, `e.detail.categories.analyitcs` and
  `window.astroConsent?.set({ analyitcs: true })` become compile-time errors,
  and autocompletion suggests the declared keys. Without it, both fall back
  to `Record<string, boolean>` — same behaviour as before.

  Also re-exports `ConsentEvent`, `ConsentKeys`, `ResolvedConsentKeys`,
  `CONSENT_EVENT`, and `CHANGE_EVENT` from the package entry so consumers
  don't need to import from internal paths.

  Closes #70, #71.

### Patch Changes

- [#69](https://github.com/zdenekkurecka/astro-consent/pull/69) [`2301140`](https://github.com/zdenekkurecka/astro-consent/commit/230114085e2cf7d33dea853193ccdbfe2b02a1a7) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Fix two regressions surfaced during the v0.3.0 code review:

  - **Event type on re-accept/re-reject.** When a user re-opened the banner
    or preferences modal after already consenting (e.g. via
    `window.astroConsent.show()` / `showPreferences()`) and clicked
    "Accept all" / "Reject all", the integration dispatched
    `astro-consent:consent` again instead of `astro-consent:change`. The
    `save-preferences` path already discriminated correctly; the two
    accept/reject branches now follow the same rule.

  - **CSP nonce lost on script activation.** Declarative blocking cloned
    placeholder `<script>` elements via `getAttribute`/`setAttribute`, but
    CSP L3 hides the `nonce` content attribute post-parse so the copy
    landed as an empty string and the activated script was blocked by a
    nonce'd CSP. The runtime now copies the nonce via the `.nonce` IDL
    property so the injected script matches the page policy.

## 0.2.2

### Patch Changes

- [#64](https://github.com/zdenekkurecka/astro-consent/pull/64) [`56a1111`](https://github.com/zdenekkurecka/astro-consent/commit/56a1111e746ddce6f8b83345cdbc9a384785f5c1) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - UI polish across the banner and preferences modal:

  - Button hierarchy: Accept all and Reject all are now both primary; Manage preferences and Save preferences are secondary. On mobile (≤480px) the two primary actions share the top row and the third button spans full-width below.
  - Modal: border removed, corners rounded, close button refined, and footer spacing made symmetric.
  - Surfaces: tint-based backgrounds with larger corner radii applied consistently across banner, modal, and category cards.
  - Categories: redesigned category cards with a "Required" badge on the essential category.
  - Policy link: policy bar restyled with a tint-based background; footer layout tightened.
  - The unused `.cc-btn-link` class has been removed from the shipped stylesheet. If you were overriding it in your own CSS, copy the rules into your stylesheet.

## 0.2.1

### Patch Changes

- [#62](https://github.com/zdenekkurecka/astro-consent/pull/62) [`066ea15`](https://github.com/zdenekkurecka/astro-consent/commit/066ea153459cc655ff91b978877927091f7df4f8) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Fix preferences modal not closing when clicking the dimmed backdrop. The `.cc-modal` wrapper spans the full viewport above `.cc-overlay`, so real user clicks on the dimmed area always landed on `#cc-modal` — never on `#cc-overlay` — and the close handler never fired. The handler now matches `#cc-modal` as the click target, and the Playwright coverage was updated to click the backdrop positionally instead of dispatching on the overlay element.

## 0.2.0

### Minor Changes

- [#46](https://github.com/zdenekkurecka/astro-consent/pull/46) [`92a3304`](https://github.com/zdenekkurecka/astro-consent/commit/92a33041caea04453e2e40b60d65aaf009a14419) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Add `storageKey` config option to override the localStorage key used to persist consent. Prevents collisions when multiple Astro apps share a single origin (e.g. `example.com/docs` and `example.com/app`). Defaults to `"astro-consent"`.

- [#47](https://github.com/zdenekkurecka/astro-consent/pull/47) [`29fc7a7`](https://github.com/zdenekkurecka/astro-consent/commit/29fc7a785f098e6f3025c0c41fb3f35cb1d7d9ee) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Add `maxAgeDays` config option to expire stored consent after N days and re-prompt the user. Useful for aligning with GDPR/DPA guidance that recommends re-asking for consent every 6–12 months. Defaults to `undefined` (no expiry).

## 0.1.3

### Patch Changes

- Configurable UI text and locale support: all banner, modal, and button strings
  can now be overridden via integration options, including per-language
  `localeText` maps. ([#15](https://github.com/zdenekkurecka/astro-consent/pull/15))
- Accessibility, API, and event-delegation fixes across the runtime. ([#12](https://github.com/zdenekkurecka/astro-consent/issues/12),
  [#13](https://github.com/zdenekkurecka/astro-consent/issues/13),
  [#14](https://github.com/zdenekkurecka/astro-consent/issues/14))

## 0.1.2

### Minor Changes

- Optional cookie policy link in the banner and preferences modal.
- CSS token defaults are now scoped to `:root` for easier theming and override
  from user stylesheets.

## 0.1.1

### Patch Changes

- Initialize on `DOMContentLoaded` when Astro View Transitions are not enabled,
  so the banner mounts reliably on non-SPA pages.

## 0.1.0

Initial public release.

- Astro integration with banner + preferences modal
- Category-based consent state (necessary / analytics / marketing)
- Runtime API and event-based callbacks
- Strict-CSP safe (no inline scripts or styles)
- Works with and without View Transitions

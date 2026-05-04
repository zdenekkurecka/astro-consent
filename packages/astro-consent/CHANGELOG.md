# @zdenekkurecka/astro-consent

## 0.3.1

### Patch Changes

- [#100](https://github.com/zdenekkurecka/astro-consent/pull/100) [`87572e9`](https://github.com/zdenekkurecka/astro-consent/commit/87572e901551e5ced54572fb577a4f6909069abc) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - `#cc-banner` and `#cc-modal` now pair `aria-hidden` with the `inert` attribute so they no longer trip the axe `aria-hidden-focus` rule (flagged by Vercel's live accessibility audit). Previously both containers shipped with `aria-hidden="true"` but kept their action buttons / toggles in the tab order, so keyboard users could focus invisible buttons and AT-aware audits failed. `inert` is added on hide and removed on show, in lock-step with `aria-hidden`. Browsers without `inert` support fall back to the existing aria-hidden-only behavior.

- [#98](https://github.com/zdenekkurecka/astro-consent/pull/98) [`248b064`](https://github.com/zdenekkurecka/astro-consent/commit/248b064ae4f435e8a490517abbb392d79b3c470b) Thanks [@zdenekkurecka](https://github.com/zdenekkurecka)! - Banner now reserves real layout space at the bottom of the host page so it no longer overlays footers and bottom CTAs. The runtime measures the banner on show (and re-measures via `ResizeObserver` when it wraps on narrow viewports), publishing the size as `--cc-banner-height` on `:root`. Default zero-specificity rules consume the var as `padding-bottom` on `body` and `scroll-padding-bottom` on `:root`, both no-ops when the banner isn't visible. The padding transition matches the banner's existing 0.3s ease so the show/hide animates cleanly.

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

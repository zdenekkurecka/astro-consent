# @zdenekkurecka/astro-consent

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

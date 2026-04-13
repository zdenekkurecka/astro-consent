# @zdenekkurecka/astro-consent

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

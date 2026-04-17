# astro-consent

> An [Astro](https://astro.build) integration for GDPR / ePrivacy-friendly
> cookie consent — banner, preferences modal, runtime API, and typed events.
> Zero runtime dependencies. Strict-CSP safe. Works with or without
> `<ClientRouter />` / View Transitions.

[![npm version](https://img.shields.io/npm/v/@zdenekkurecka/astro-consent.svg?style=flat-square)](https://www.npmjs.com/package/@zdenekkurecka/astro-consent)
[![npm downloads](https://img.shields.io/npm/dm/@zdenekkurecka/astro-consent.svg?style=flat-square)](https://www.npmjs.com/package/@zdenekkurecka/astro-consent)
[![license](https://img.shields.io/npm/l/@zdenekkurecka/astro-consent.svg?style=flat-square)](./LICENSE)
[![astro](https://img.shields.io/badge/astro-%5E5%20%7C%7C%20%5E6-ff5e00?style=flat-square&logo=astro&logoColor=white)](https://astro.build)

---

## Table of contents

- [Why this integration?](#why-this-integration)
- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [How-tos](#how-tos)
  - [React to consent changes](#react-to-consent-changes)
  - [Trigger the UI from your own buttons](#trigger-the-ui-from-your-own-buttons)
  - [Open the preferences modal from a footer link](#open-the-preferences-modal-from-a-footer-link)
  - [Gate third-party scripts (GA, Meta Pixel, …)](#gate-third-party-scripts-ga-meta-pixel-)
  - [Enable Google Consent Mode v2](#enable-google-consent-mode-v2)
  - [Re-prompt users after changing categories](#re-prompt-users-after-changing-categories)
  - [Customise banner & modal text (and localize it)](#customise-banner--modal-text-and-localize-it)
  - [Theme the UI](#theme-the-ui)
  - [Use with a strict Content Security Policy](#use-with-a-strict-content-security-policy)
  - [Debug mode](#debug-mode)
- [Runtime API](#runtime-api)
- [Events](#events)
- [Accessibility](#accessibility)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Contributing](#contributing)
- [License](#license)

---

## Why this integration?

Most cookie-consent libraries were written for plain HTML sites and fall over
the moment you drop them into a modern Astro app: they inject inline scripts
(breaking strict CSPs), they re-initialize incorrectly on View Transitions, or
they force you to serialize your tracker callbacks into a JSON config.

`astro-consent` is built for the way Astro actually works:

- It is installed as an **Astro integration**, not a `<script>` tag.
- It runs through Astro's Vite / CSS pipeline, so its script and stylesheet
  are emitted as **hashed external assets** — compatible with
  `script-src 'self'; style-src 'self'` with no `'unsafe-inline'`.
- It re-initializes on `astro:page-load`, so it behaves correctly on sites
  that use `<ClientRouter />` for View Transitions.
- You wire your trackers up in **regular `<script>` tags in your layout**,
  using typed `document` events — no callback serialization, full access to
  your module scope.

## Features

- **Banner + preferences modal** out of the box
- **Category-based consent** (`analytics`, `marketing`, … — whatever you
  declare), plus an always-on implicit `essential` category
- **Versioned consent** — bump a number to re-prompt every user
- **Typed** config, runtime API, and `document` event map
- **Optional cookie policy link** surfaced in both banner and preferences modal
- **Fully configurable UI text** with partial overrides and per-locale
  resolution from `<html lang>` — every banner / modal string can be
  translated or customised
- **Accessible modal**: `role="dialog"` / `aria-modal`, focus trap, focus
  restoration, `Escape` to close, click-outside to dismiss
- **Declarative script blocking** via `type="text/plain"` +
  `data-cc-category` — gate trackers and embeds without writing glue code
- **Google Consent Mode v2** out of the box: opt-in config that maps your
  categories to GCM signals, injects the default-denied snippet, and wires
  `gtag('consent', 'update', …)` into the consent events
- **Strict-CSP safe**: no inline `<script>`, no inline `<style>`
- **View Transitions ready**: initializes on `DOMContentLoaded` *and*
  `astro:page-load`, idempotently
- **Zero runtime dependencies**

## Installation

The recommended way is to use Astro's integration installer, which adds the
package and wires it into `astro.config.*` in one step:

```sh
# pnpm
pnpm astro add @zdenekkurecka/astro-consent
# npm
npx astro add @zdenekkurecka/astro-consent
# yarn
yarn astro add @zdenekkurecka/astro-consent
```

> **Heads up:** `cookieConsent()` requires at least `version` and `categories`.
> `astro add` inserts a bare `cookieConsent()` call — open `astro.config.*`
> after it runs and pass the required options shown in [Quick start](#quick-start).
> You'll get a clear error at build time if you forget.

Or install manually:

```sh
# pnpm
pnpm add @zdenekkurecka/astro-consent
# npm
npm install @zdenekkurecka/astro-consent
# yarn
yarn add @zdenekkurecka/astro-consent
```

Peer dependency: `astro@^5 || ^6`. Node `>=18.17`.

## Quick start

Add the integration to your `astro.config.*` and declare whichever categories
you need:

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cookieConsent from '@zdenekkurecka/astro-consent';

export default defineConfig({
  integrations: [
    cookieConsent({
      version: 1,
      categories: {
        analytics: {
          label: 'Analytics',
          description: 'Helps us understand how the site is used.',
          default: false,
        },
        marketing: {
          label: 'Marketing',
          description: 'Used to personalize ads.',
          default: false,
        },
      },
    }),
  ],
});
```

That's it. On the next page load you'll see a banner, the preferences modal
is accessible via the "Manage preferences" button, and the current state is
persisted under `localStorage`.

> **Note:** An `essential` category is always implicit. It appears in the
> preferences modal as a disabled-on toggle and is always `true` in the
> consent state. You do not need to declare it yourself — and you
> shouldn't.

## Configuration

```ts
interface ConsentConfig {
  /** Bump this number to invalidate existing consent and re-prompt users. */
  version: number;

  /** The user-visible categories of cookies you want consent for. */
  categories: Record<string, {
    label: string;
    description: string;
    default: boolean;
  }>;

  /**
   * Optional link to your cookie / privacy policy. When provided, a small
   * link is rendered inside the banner and inside the preferences modal.
   * Only `http(s)://` URLs and same-origin paths (`/…`, `#…`, `?…`) are
   * accepted — other schemes (e.g. `javascript:`) are ignored.
   */
  cookiePolicy?: {
    url: string;
    /** Defaults to `"Cookie Policy"`. */
    label?: string;
  };

  /**
   * localStorage key used to persist the consent record. Override this when
   * multiple Astro apps share a single origin (e.g. `example.com/docs` and
   * `example.com/app`) so they don't clobber each other's state.
   *
   * @default "astro-consent"
   */
  storageKey?: string;

  /**
   * Maximum age of a stored consent record, in days. When set, a consent
   * record older than this is treated as missing and the banner is
   * re-shown — useful for complying with GDPR/DPA guidance that
   * recommends re-prompting every 6–12 months.
   *
   * @default undefined (no expiry)
   */
  maxAgeDays?: number;

  /**
   * Enables verbose `console.debug` logging of runtime events (init, banner
   * show, accept/reject/save, event dispatch, storage writes) and exposes
   * `window.astroConsent.debug()` for an on-demand state dump. Gate it
   * behind `import.meta.env.DEV` so it never ships to production.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Single-language text overrides for the banner and modal. Any field
   * omitted falls back to the built-in English default. Also used as a
   * shared fallback layer under `localeText`.
   */
  text?: ConsentText;

  /**
   * Per-locale text overrides. Keys are BCP 47 language tags matched
   * against `<html lang>` at runtime (e.g. `"en"`, `"cs"`, `"en-US"`).
   *
   * Resolution order: exact match → primary subtag → `text` →
   * built-in defaults.
   */
  localeText?: Record<string, ConsentText>;

  /**
   * Google Consent Mode v2 integration. When set, the integration injects an
   * inline snippet at the top of `<head>` to pre-declare denied defaults, and
   * auto-dispatches `gtag('consent', 'update', …)` on every consent event.
   *
   * Opt-in. Requires `'unsafe-inline'` (or a matching hash) under strict CSP —
   * see [Enable Google Consent Mode v2](#enable-google-consent-mode-v2).
   */
  googleConsentMode?: GoogleConsentModeConfig;
}

interface ConsentText {
  // Banner
  bannerText?: string;
  acceptAll?: string;        // shared by banner + modal
  rejectAll?: string;        // shared by banner + modal
  manage?: string;

  // Modal
  modalTitle?: string;
  closeAriaLabel?: string;
  savePreferences?: string;

  // Essential category
  essentialLabel?: string;
  essentialDescription?: string;

  /** Per-category label/description overrides (key = category key). */
  categories?: Record<string, { label?: string; description?: string }>;
}
```

Example with a cookie policy link:

```js
cookieConsent({
  version: 1,
  cookiePolicy: {
    url: '/legal/cookies',
    label: 'Cookie Policy',
  },
  categories: {
    analytics: {
      label: 'Analytics',
      description: 'Help us understand how visitors use the site.',
      default: false,
    },
  },
});
```

Under the hood, the integration:

1. Registers a Vite plugin exposing this config to the client via a virtual
   module (`virtual:astro-consent/init`).
2. Injects the runtime with `injectScript('page', ...)`, which Astro compiles
   into a hashed `<script type="module" src="…">` — never inline.
3. Injects the stylesheet with `injectScript('page-ssr', ...)`, which flows
   through Astro's CSS pipeline and becomes a hashed external
   `<link rel="stylesheet">` — never inline.

## How-tos

### React to consent changes

The integration dispatches typed `CustomEvent`s on `document`. Subscribe from
a regular `<script>` tag in your layout — you have full access to the module
scope (imports, closures, framework globals), unlike callbacks that would
have to be serialized through integration config.

```astro
---
// src/layouts/Layout.astro
---
<html>
  <body>
    <slot />
    <script>
      import { loadAnalytics, loadAds } from '../lib/trackers';

      // Fired once per session after consent has been given (or after we
      // detect an existing valid consent record on first page load).
      document.addEventListener('astro-consent:consent', (e) => {
        if (e.detail.categories.analytics) loadAnalytics();
        if (e.detail.categories.marketing) loadAds();
      });

      // Fired whenever the user updates their preferences after the initial
      // consent. Use this to tear down or re-enable trackers.
      document.addEventListener('astro-consent:change', (e) => {
        console.log('consent updated', e.detail);
      });
    </script>
  </body>
</html>
```

Both events are typed: importing this package augments `DocumentEventMap`,
so `e.detail` is inferred as `ConsentState`.

### Trigger the UI from your own buttons

Any element with a `data-cc` attribute is handled by the delegated listener —
you don't need to add event listeners yourself:

```html
<button data-cc="accept-all">Accept all</button>
<button data-cc="reject-all">Reject all</button>
<button data-cc="manage">Manage preferences</button>
```

### Open the preferences modal from a footer link

A classic "Cookie settings" link in your footer:

```astro
<footer>
  <button type="button" data-cc="manage">Cookie settings</button>
</footer>
```

Or programmatically, from anywhere in your app:

```ts
window.astroConsent?.showPreferences();
```

### Gate third-party scripts (GA, Meta Pixel, …)

There are two ways to gate a tracker: a declarative markup pattern (good for
90% of cases), and the event-based hook (for anything that needs custom
logic). They compose — use whichever fits each tracker.

#### Declarative blocking (recommended)

Mark a `<script>` with `type="text/plain"` and a `data-cc-category`. The
browser treats `text/plain` scripts as inert data, so the tracker stays
dormant until the integration unblocks it once the category is granted.
Use `data-cc-src` for external scripts and a plain body for inline ones.

```astro
<!-- External — recommended, CSP-safe -->
<script
  is:inline
  type="text/plain"
  data-cc-category="analytics"
  data-cc-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"
  async
></script>

<!-- Inline — requires `'unsafe-inline'` (or a nonce) under strict CSP -->
<script is:inline type="text/plain" data-cc-category="analytics">
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>

<!-- iframe embeds work the same way -->
<iframe
  data-cc-category="marketing"
  data-cc-src="https://www.youtube.com/embed/…"
></iframe>
```

Use `is:inline` so Astro leaves the placeholder markup untouched — otherwise
the compiler may bundle or rewrite the tag and break the `type="text/plain"`
convention.

**`<ConsentScript>` component.** A thin Astro component is exported from
`@zdenekkurecka/astro-consent/components` for the common case — it emits the
same placeholder markup as above (including `is:inline`) with a named-prop
API and forwards any other `<script>` attributes through:

```astro
---
import { ConsentScript } from '@zdenekkurecka/astro-consent/components';
---
<ConsentScript
  category="analytics"
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"
  async
/>

<ConsentScript category="analytics">
  {`window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');`}
</ConsentScript>
```

How it works:

- On `astro-consent:consent` / `astro-consent:change`, the integration scans
  for blocked elements whose category is now granted and activates them in
  place.
- A `MutationObserver` catches blocked elements inserted after the initial
  scan (e.g. via client-side routing or framework islands).
- All other attributes on the placeholder (`async`, `defer`, `nonce`,
  `integrity`, `crossorigin`, …) are preserved on the activated script.
- Activated elements are marked with `data-cc-activated="true"` so repeated
  scans are a no-op.

**Revocation caveat.** Once a tracker has executed, the integration cannot
unload it — most trackers aren't teardown-safe. If a user later revokes a
category, the next full page load will keep those scripts blocked, but the
current session will still have them running. Design accordingly, or drive
teardown yourself from `astro-consent:change`.

#### Event-based hook (advanced / full control)

For trackers that need custom bootstrap logic — dynamic config, manual
teardown, integration with `window.dataLayer` before the script tag lands —
listen to the consent events directly:

```astro
<script>
  function loadGA() {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX';
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args) { window.dataLayer.push(args); }
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXX');
  }

  document.addEventListener('astro-consent:consent', (e) => {
    if (e.detail.categories.analytics) loadGA();
  });

  document.addEventListener('astro-consent:change', (e) => {
    // A real implementation would also tear GA down when revoked.
    if (e.detail.categories.analytics) loadGA();
  });
</script>
```

### Enable Google Consent Mode v2

GA4, Google Ads, and every other Google tag need
[Consent Mode v2](https://developers.google.com/tag-platform/security/concepts/consent-mode)
to run legally in the EU. The integration ships first-class support: map your
categories to GCM signals and the rest is handled for you.

```ts
cookieConsent({
  version: 1,
  categories: {
    analytics: { label: 'Analytics', description: '…', default: false },
    marketing: { label: 'Marketing', description: '…', default: false },
  },
  googleConsentMode: {
    enabled: true,
    mapping: {
      analytics: ['analytics_storage'],
      marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    },
    // Hint to GTM on how long to delay firing tags. Default 500ms.
    waitForUpdate: 500,
    // Optional: regional default overrides. Accepts either a single value
    // (applied to every mapped signal) or a per-signal object.
    regions: {
      US: 'granted',
      BR: { ad_storage: 'denied' },
    },
    // Optional Google flags, forwarded via gtag('set', …).
    adsDataRedaction: true,
    urlPassthrough: false,
  },
});
```

What the integration does for you:

1. Injects an inline snippet at the top of `<head>` that bootstraps
   `window.dataLayer` + `gtag` and calls `gtag('consent', 'default', { …,
   wait_for_update: 500 })` with every mapped signal set to `"denied"` (unless
   overridden via `defaults` / `regions`).
2. On every `astro-consent:consent` or `astro-consent:change` event,
   dispatches `gtag('consent', 'update', …)` with each signal set to
   `"granted"` only when **every** category that maps to it is granted.
3. Forwards `adsDataRedaction` / `urlPassthrough` as `gtag('set', …)` calls in
   the default snippet.

Drop your GA4 / Google Ads tag anywhere in your layout (or gate it via
`data-cc-category` — the two compose) and it will pick up the consent state
automatically:

```astro
<script
  is:inline
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"
></script>
<script is:inline>
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
```

**CSP caveat.** The default snippet is inline, so enabling
`googleConsentMode` requires `script-src` to include `'unsafe-inline'` or a
matching hash/nonce. If you don't configure `googleConsentMode`, the
integration stays strict-CSP-safe.

```ts
interface GoogleConsentModeConfig {
  enabled?: boolean;                                          // default: true
  mapping: Partial<Record<string, GoogleConsentSignal[]>>;
  waitForUpdate?: number;                                     // default: 500
  defaults?: Partial<Record<GoogleConsentSignal, 'granted' | 'denied'>>;
  regions?: Record<string,
    | 'granted' | 'denied'
    | Partial<Record<GoogleConsentSignal, 'granted' | 'denied'>>
  >;
  adsDataRedaction?: boolean;
  urlPassthrough?: boolean;
}

type GoogleConsentSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';
```

### Re-prompt users after changing categories

If you add, remove, or meaningfully change a category (e.g. splitting
`marketing` into `marketing` and `personalization`), bump the `version`
number in your integration config:

```ts
cookieConsent({
  version: 2, // was 1
  categories: { /* … */ },
});
```

Any stored consent with a lower version is treated as missing and the banner
re-appears for every user on their next visit.

### Customise banner & modal text (and localize it)

Every string in the banner and modal can be overridden. For a single-language
site, pass a `text` object. For a multi-lingual site, pass a `localeText`
map keyed by BCP 47 language tag — the integration reads
`document.documentElement.lang` at runtime and picks the best match.

Resolution order: **exact locale match** → **primary subtag** (e.g. `en-GB`
falls back to `en`) → shared `text` → **built-in English defaults**. All
fields are optional and layers compose, so you only need to supply the keys
you actually want to change.

```ts
cookieConsent({
  version: 1,
  categories: {
    analytics: { label: 'Analytics', description: '…', default: false },
  },
  localeText: {
    en: {
      bannerText: 'We use cookies to improve your experience and analyse traffic.',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      manage: 'Manage preferences',
      modalTitle: 'Cookie preferences',
      closeAriaLabel: 'Close preferences',
      savePreferences: 'Save preferences',
      essentialLabel: 'Essential',
      essentialDescription: 'Required for the website to function. Cannot be disabled.',
      categories: {
        analytics: {
          label: 'Analytics',
          description: 'Helps us understand how visitors use the site.',
        },
      },
    },
    cs: {
      bannerText: 'Používáme cookies ke zlepšení vašeho zážitku a analýze návštěvnosti.',
      acceptAll: 'Přijmout vše',
      rejectAll: 'Odmítnout vše',
      manage: 'Spravovat předvolby',
      modalTitle: 'Předvolby cookies',
      closeAriaLabel: 'Zavřít předvolby',
      savePreferences: 'Uložit předvolby',
      essentialLabel: 'Nezbytné',
      essentialDescription: 'Nutné pro fungování webu. Nelze vypnout.',
      categories: {
        analytics: {
          label: 'Analytické',
          description: 'Pomáhají nám pochopit, jak návštěvníci web používají.',
        },
      },
    },
  },
});
```

Set `<html lang="cs">` and the Czech strings render; set `<html lang="en-GB">`
and the `en` primary-subtag fallback kicks in. If neither `text` nor a
matching `localeText` entry is supplied, the built-in English defaults are
used.

Per-category `label` / `description` pulled from `localeText` override the
ones declared in `categories`, so you can keep a single category-key
definition and translate its user-visible labels per language.

### Theme the UI

The base stylesheet is injected automatically via Astro's CSS pipeline as a
hashed external `<link>`. If you'd rather pull it into your own CSS pipeline,
it is exposed via a subpath export:

```ts
import '@zdenekkurecka/astro-consent/styles';
```

The styles use CSS custom properties, so you can theme them from your own
stylesheet without forking anything:

```css
:root {
  --cc-primary: #7c3aed;
  --cc-primary-hover: #6d28d9;
  --cc-radius: 0.75rem;
  --cc-font-family: 'Inter', sans-serif;
}
```

### Use with a strict Content Security Policy

The integration is compatible with strict CSPs out of the box:

```http
Content-Security-Policy:
  default-src 'self';
  script-src  'self';
  style-src   'self';
```

No `'unsafe-inline'` is required for either scripts or styles, because the
integration only uses `injectScript('page', ...)` (emitted as a hashed
external module script) and `injectScript('page-ssr', ...)` (which flows
through Astro's CSS extractor and becomes a hashed external stylesheet).

### Debug mode

During local integration work it can be hard to tell what the runtime is
doing — which events fired, which locale was resolved, whether the stored
version still matches. Set `debug: true` to opt in to verbose logging. Gate
it on `import.meta.env.DEV` so it never ships to production:

```js
// astro.config.mjs
cookieConsent({
  version: 1,
  debug: import.meta.env.DEV,
  categories: { /* ... */ },
});
```

With debug on, the runtime emits `console.debug('[astro-consent]', …)` at
every lifecycle point: init (with version, resolved locale, stored consent),
banner show, accept/reject/save clicks, event dispatches, and localStorage
writes. Because it uses `console.debug`, you need to include **Verbose** in
your DevTools log level to see the messages.

You also get an on-demand snapshot helper:

```js
window.astroConsent.debug();
// groups and returns:
// {
//   config,          // the full serialized integration config
//   resolvedLocale,  // matched <html lang> key, or null
//   resolvedText,    // fully merged UI text used by the banner/modal
//   storageKey,      // active localStorage key
//   state,           // current ConsentState, or null
//   versionMatch,    // stored version === config version
//   needsConsent,    // true if banner would be shown right now
// }
```

`astroConsent.debug` is only attached when `debug: true`, so production
bundles stay clean. Typed as optional in `ConsentAPI`, so TypeScript will
remind you to null-check it.

## Runtime API

A global `window.astroConsent` is exposed (also aliased as
`window.zdenekkureckaConsent`, deprecated):

```ts
interface ConsentAPI {
  /** Returns the currently stored consent state, or `null` if none. */
  get(): ConsentState | null;

  /**
   * Merge a partial category map into the current state and persist it.
   *
   * If no consent has been recorded yet (first-time visitor who has not
   * interacted with the banner), this seeds an initial consent record from
   * the config defaults, hides the banner, and dispatches
   * `astro-consent:consent`. Subsequent calls merge into the existing state
   * and dispatch `astro-consent:change` instead.
   *
   * The `essential` category is always forced to `true` and cannot be
   * disabled through this method.
   */
  set(categories: Partial<Record<string, boolean>>): void;

  /** Clear the stored consent and re-show the banner. */
  reset(): void;

  /** Show the consent banner. */
  show(): void;

  /** Open the preferences modal. */
  showPreferences(): void;

  /**
   * Dumps the current config, resolved locale/text, storage key, stored
   * state, and version/needs-consent flags to a `console.group`, and
   * returns the same snapshot. Only attached when the integration is
   * configured with `debug: true`.
   */
  debug?(): ConsentDebugSnapshot;
}

interface ConsentState {
  version: number;
  timestamp: number;
  categories: Record<string, boolean>;
}
```

Example:

```ts
// Read current state
const state = window.astroConsent?.get();

// Programmatically update. Safe to call before the user has interacted
// with the banner — the missing categories fall back to your config
// defaults and an initial consent record is written.
window.astroConsent?.set({ analytics: true });

// Re-open the preferences modal (e.g. from a "Cookie settings" footer link)
window.astroConsent?.showPreferences();

// Clear consent and re-prompt
window.astroConsent?.reset();
```

## Events

| Event                    | When it fires                                                                                      | `e.detail`     |
| ------------------------ | -------------------------------------------------------------------------------------------------- | -------------- |
| `astro-consent:consent`  | Once per session, after the user gives consent — or on first page load if valid consent exists.   | `ConsentState` |
| `astro-consent:change`   | Whenever the user updates their preferences after initial consent.                                | `ConsentState` |

Both are typed `CustomEvent`s on `document`, so in TypeScript you get full
autocompletion on `e.detail.categories`.

## Accessibility

- Modal has `role="dialog"` with `aria-modal="true"` and `aria-labelledby`
  pointing at the visible title.
- Opening the modal saves the previously focused element and moves focus to
  the first control inside the dialog on the next animation frame.
- `Tab` / `Shift+Tab` is trapped inside the modal while it's open.
- `Escape` closes the modal and returns focus to the trigger.
- Clicking the overlay closes the modal; the overlay itself is `aria-hidden`.
- Banner and modal both toggle `aria-hidden` in lockstep with their
  visibility, so screen readers don't announce them while they are
  visually hidden.
- All buttons have `type="button"` so they never submit ambient forms.

## Repository layout

This repository is a pnpm workspace:

```
.
├── packages/
│   └── astro-consent/        # the published npm package
│       ├── src/               # integration, runtime, UI, types, styles
│       └── README.md          # the README published to npm
├── playground/                # Astro app used to develop and test locally
├── package.json
├── pnpm-workspace.yaml
└── README.md                  # you are here
```

## Local development

```sh
# Install dependencies
pnpm install

# Build the package and start the playground dev server
pnpm dev

# Build the package and the playground
pnpm build

# Build everything in the workspace
pnpm build:all
```

The playground in `playground/` is a small Astro app wired up to the local
package. Use it to iterate on the integration, try out new config options,
and verify View Transitions behavior.

## Contributing

Issues and pull requests are welcome. If you're reporting a bug, a minimal
reproduction in the playground app (or a link to a minimal Astro repro)
massively speeds things up.

- [Open an issue](https://github.com/zdenekkurecka/astro-consent/issues)
- [Browse the source](./packages/astro-consent/src)

## License

[MIT](./LICENSE) © zdenekkurecka

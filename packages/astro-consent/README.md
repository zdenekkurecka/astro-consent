# @zdenekkurecka/astro-consent

An Astro integration for GDPR/ePrivacy-friendly cookie consent. Ships a consent
banner, a preferences modal, a small runtime API, and category-based consent
state persisted in `localStorage`.

- Zero-dependency runtime
- Works on standard Astro sites **and** with View Transitions / SPA routing —
  the runtime initializes on `DOMContentLoaded` (or immediately if the DOM is
  already parsed) and re-runs on `astro:page-load` when `<ClientRouter />` is
  active
- Versioned consent — bump `version` to re-prompt users
- Typed config, runtime API, and typed `document` event map
- Accessible modal — `role="dialog"` / `aria-modal`, focus trap, focus
  restoration, Escape to close
- **Strict-CSP safe**: no inline `<script>`, no inline `<style>`. The runtime
  is emitted as a hashed `<script type="module" src>` and the CSS as a
  hashed `<link rel="stylesheet">` — works under `script-src 'self'` and
  `style-src 'self'` without any `'unsafe-inline'`

## Install

```sh
# pnpm
pnpm add @zdenekkurecka/astro-consent
# npm
npm install @zdenekkurecka/astro-consent
# yarn
yarn add @zdenekkurecka/astro-consent
```

Peer dependency: `astro@^5 || ^6`.

## Usage

Add the integration to `astro.config.*`:

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

> An `essential` category is always implicit — it's shown as a disabled
> toggle in the modal and is always `true` in the consent state. You don't
> need to (and shouldn't) declare it yourself.

The integration:

1. Registers a Vite plugin that exposes the config to the client via a
   virtual module (`virtual:astro-consent/init`).
2. Injects the runtime via `injectScript('page', ...)` which Astro compiles
   to a hashed `<script type="module" src="...">` — never inline.
3. Injects the stylesheet via `injectScript('page-ssr', ...)` which routes
   the CSS through Astro's normal CSS pipeline, emitting a hashed
   `<link rel="stylesheet">` — never inline.

The injected runtime bootstraps itself on `DOMContentLoaded` (or synchronously
if the document is already parsed) **and** on `astro:page-load`, so it works
identically on plain Astro sites and on sites using `<ClientRouter />` for
View Transitions. Initialization is idempotent, so subsequent SPA navigations
only re-attach per-page state.

### Reacting to consent changes

Callbacks are delivered as typed `CustomEvent`s on `document`. Subscribe from
a regular `<script>` tag in your layout or page — you have access to the full
module scope (imports, closures, framework globals), unlike callbacks serialized
through the integration config.

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

      // Fired when the user updates their preferences after the initial
      // consent. Use this to tear down or re-enable trackers.
      document.addEventListener('astro-consent:change', (e) => {
        console.log('consent updated', e.detail);
      });
    </script>
  </body>
</html>
```

Both events are typed — adding this package as a dependency augments
`DocumentEventMap` so `e.detail` is inferred as `ConsentState`.

### Triggering UI from your own buttons

Any element with a `data-cc` attribute is handled by the delegated listener:

```html
<button data-cc="accept-all">Accept all</button>
<button data-cc="reject-all">Reject all</button>
<button data-cc="manage">Manage preferences</button>
```

### Runtime API

A global `window.zdenekkureckaConsent` is exposed:

```ts
interface ConsentAPI {
  get(): ConsentState | null;
  set(categories: Partial<Record<string, boolean>>): void;
  reset(): void;
  show(): void;
  showPreferences(): void;
}
```

Example:

```ts
// Read current state
const state = window.zdenekkureckaConsent.get();

// Programmatically update
window.zdenekkureckaConsent.set({ analytics: true });

// Re-open the preferences modal (e.g. from a "Cookie settings" footer link)
window.zdenekkureckaConsent.showPreferences();

// Clear consent and re-prompt
window.zdenekkureckaConsent.reset();
```

### Styling

The base stylesheet is injected automatically via Astro's CSS pipeline as a
hashed `<link>`. If you want to import it yourself (e.g. to bundle it into
your own CSS pipeline) it is exposed via a subpath export:

```ts
import '@zdenekkurecka/astro-consent/styles';
```

The styles use CSS custom properties so you can theme them from your own CSS:

```css
:where(#cc-container) {
  --cc-primary: #7c3aed;
  --cc-primary-hover: #6d28d9;
  --cc-radius: 0.75rem;
  --cc-font-family: 'Inter', sans-serif;
}
```

### Accessibility

- Modal has `role="dialog"` with `aria-modal="true"` and `aria-labelledby`
  pointing at the visible title.
- Opening the modal saves the previously focused element and moves focus to
  the first control inside the dialog on the next animation frame.
- `Tab` / `Shift+Tab` is trapped inside the modal while it is open.
- `Escape` closes the modal and returns focus to the trigger.
- Clicking the overlay closes the modal; the overlay itself is `aria-hidden`.
- All buttons have `type="button"` so they never submit ambient forms.

### Content Security Policy

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

### Versioning consent

Bump the `version` in the integration config whenever your categories change
in a way that requires re-asking users. Any stored consent with a lower
version is treated as missing, and the banner will be re-shown.

## License

MIT

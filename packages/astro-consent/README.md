# @zdenekkurecka/astro-consent

An Astro integration for GDPR/ePrivacy-friendly cookie consent. Ships a consent
banner, a preferences modal, a small runtime API, and category-based consent
state persisted in `localStorage`.

- Zero-dependency runtime
- Works with Astro's View Transitions / SPA routing (`astro:page-load`)
- Versioned consent — bump `version` to re-prompt users
- Typed config and runtime API
- CSS is shipped as a single stylesheet that the integration injects for you

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
        essential: {
          label: 'Essential',
          description: 'Required for the site to function.',
          default: true,
        },
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
      onConsent(state) {
        // Fired once per session after the user has given (or already has) consent.
        if (state.categories.analytics) {
          // load analytics
        }
      },
      onChange(state) {
        // Fired when the user updates their preferences.
        console.log('consent updated', state);
      },
    }),
  ],
});
```

The integration:

1. Registers a Vite plugin that exposes the config via a virtual module.
2. Injects the CSS inline into `<head>` (so there is no flash of unstyled banner).
3. Injects a small client entry on every page that renders the banner / modal
   and wires up event delegation.

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

The base stylesheet is injected automatically. If you want to import it
yourself (e.g. to bundle it into your own CSS pipeline), it is exposed via a
subpath export:

```ts
import '@zdenekkurecka/astro-consent/styles';
```

The styles use CSS custom properties so you can theme them from your own CSS.

### Versioning consent

Bump the `version` in the integration config whenever your categories change
in a way that requires re-asking users. Any stored consent with a lower
version is treated as missing, and the banner will be re-shown.

## License

MIT

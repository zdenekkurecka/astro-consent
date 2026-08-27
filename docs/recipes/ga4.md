# Google Analytics 4 (gtag.js)

GA4 is the plain `gtag.js` tag — no container in the middle. There are two
ways to wire it up.

- [**Recommended: with Google Consent Mode v2**](#recommended-with-google-consent-mode-v2)
  — let GA4 load unconditionally and respect consent via GCM signals.
- [**Alternative: block until consent**](#alternative-block-the-tag-until-consent)
  — gate the entire `<script>` behind the `analytics` category.

## Category mapping

| Category    | Purpose                          |
| ----------- | -------------------------------- |
| `analytics` | GA4 page views, events, sessions |

## Recommended: with Google Consent Mode v2

Pros: GA4 can collect anonymous pings (e.g. `gtag('config', ..., { 'anonymize_ip': true })`-style
behaviour built into GCM) before consent, ensuring model-based conversion
attribution works once the user opts in.

### 1. Configure the integration

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
          description: 'Helps us understand how visitors use the site.',
          default: false,
        },
      },
      googleConsentMode: {
        enabled: true,
        mapping: {
          analytics: ['analytics_storage'],
        },
      },
    }),
  ],
});
```

### 2. Drop the GA4 tag at the top of `<body>`

```astro
---
// src/layouts/Layout.astro
---
<html>
  <head>
    <slot name="head" />
  </head>
  <body>
    <!-- After </head>, so the integration's consent default has already run. -->
    <script
      is:inline
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"
    ></script>
    <script is:inline>
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXX');
    </script>
    <slot />
  </body>
</html>
```

The integration's GCM snippet is injected into `<head>`, so it runs before
anything in `<body>` — including these tags. GA4 boots, reads the
denied-by-default signals, and only starts writing cookies after
`astro-consent:consent` triggers the `gtag('consent', 'update', ...)` bridge.

### Gotchas

- **Order matters, and `<head>` is *not* safe.** The GCM snippet must run
  before `gtag('config', …)`. Astro emits injected `head-inline` scripts
  *after* the route's own `<head>` content, so the snippet is the **last**
  thing in `<head>`, not the first. A tag authored in your layout's `<head>`
  therefore runs *first* — the exact inversion Consent Mode exists to
  prevent. Put the tag at the top of `<body>` as above, or inject it from an
  integration listed after `cookieConsent()` in `integrations` (injected
  head-inline scripts are emitted in integrations-array order).
- **CSP.** The GCM default snippet is inline, so `script-src` must allow
  `'unsafe-inline'` (or a matching hash). Same goes for the inline
  `gtag('config', ...)` call above — extract it into an external file if you
  want strict CSP.
- **`anonymize_ip` is gone.** GA4 anonymises IPs automatically; don't copy
  the old Universal Analytics flag from the internet.

## Alternative: block the tag until consent

Use this if you can't enable GCM (strict CSP with no inline allowance, or
you don't want the denied-by-default pings).

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

GA4 doesn't load at all until `analytics` is granted. Fine for most sites;
the trade-off is that you lose GCM's pre-consent modelled data.

### Revocation

If the user revokes analytics in the preferences modal, the current session
keeps GA4 running — there's no clean gtag teardown API. The next page load
honours the new state and keeps the tag blocked. If this matters, prefer the
GCM approach: `gtag('consent', 'update', { analytics_storage: 'denied' })` is
dispatched automatically by the integration on revocation, and GA4 will stop
writing cookies from that point forward.

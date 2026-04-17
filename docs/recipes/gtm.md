# Google Tag Manager

GTM is a container: it ships a single loader script that then fires whatever
tags you configure inside the GTM UI. The correct consent integration is
almost always **Google Consent Mode v2** — it lets each tag inside the
container opt into consent-aware behaviour on its own, which is exactly how
Google expects the pipeline to work.

## Category mapping

Conceptually, GTM itself is consent-neutral — it's a loader. What matters is
which signals the *tags inside it* read. Map every GCM signal your tags will
check:

| Category    | GCM signals                                                |
| ----------- | ---------------------------------------------------------- |
| `analytics` | `analytics_storage`                                        |
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization`         |

## Recommended: with Google Consent Mode v2

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
        analytics: { label: 'Analytics', description: '…', default: false },
        marketing: { label: 'Marketing', description: '…', default: false },
      },
      googleConsentMode: {
        enabled: true,
        mapping: {
          analytics: ['analytics_storage'],
          marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
        },
        // Hint GTM to wait this long before firing tags so the update call
        // can land first. 500ms is Google's recommended default.
        waitForUpdate: 500,
      },
    }),
  ],
});
```

### 2. Drop the GTM snippet in your layout

```astro
---
// src/layouts/Layout.astro
---
<html>
  <head>
    <script is:inline>
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','GTM-XXXXXXX');
    </script>
  </head>
  <body>
    <!-- GTM noscript fallback. -->
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
        height="0"
        width="0"
        style="display:none;visibility:hidden"
      ></iframe>
    </noscript>
    <slot />
  </body>
</html>
```

The integration emits its GCM default snippet at the top of `<head>` *before*
GTM loads, so `gtag('consent', 'default', …)` runs first. Each tag you
configure in the GTM UI should have its "Consent Settings" set to "Require
additional consent" for the relevant signals — GTM will then defer or fire
them based on the signal state.

### 3. Configure your tags inside GTM

In the GTM UI, for every tag:

1. Open **Tag Configuration → Advanced Settings → Consent Settings**.
2. Set the **Consent Type** to e.g. `analytics_storage` (for GA4) or
   `ad_storage` + `ad_user_data` + `ad_personalization` (for Google Ads).

This is the step that most integrations forget. Without it, your tags ignore
the consent signal and fire regardless.

### Gotchas

- **`dataLayer` must already exist.** The integration's GCM snippet initialises
  `window.dataLayer` before GTM's loader runs, so you don't need to do it
  yourself — but if you push events from Astro components, make sure those
  pushes don't run before the GCM snippet either.
- **`waitForUpdate`.** The default 500ms gives the banner time to render and
  the user time to click if they're fast. If your page is very slow to
  interactive, bump it. If you want no delay on return visits where consent
  is already stored, don't — the integration dispatches the update event
  immediately on `astro-consent:consent` for returning users, which GTM
  interprets as "update arrived, stop waiting".
- **CSP.** GTM's loader and the GCM default snippet are both inline.
  `script-src 'unsafe-inline'` (or matching hashes) is required.
- **Don't also gate the GTM snippet.** Wrapping the loader in a
  `<ConsentScript category="analytics">` defeats GCM. The point of GCM is
  that the loader *does* run pre-consent, but its tags fire in a
  consent-aware degraded mode.

## Alternative: block GTM until consent

If you really can't run GTM pre-consent (e.g. your legal review requires it),
gate the loader and skip GCM:

```astro
---
import { ConsentScript } from '@zdenekkurecka/astro-consent/components';
---
<ConsentScript category="analytics">
  {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');`}
</ConsentScript>
```

You also won't get GCM's modelled conversions — accept this trade-off
consciously.

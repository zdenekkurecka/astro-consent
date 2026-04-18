---
'@zdenekkurecka/astro-consent': minor
---

First-class Google Consent Mode v2 support via a new `googleConsentMode`
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
  categories: { /* … */ },
  googleConsentMode: {
    mapping: {
      analytics: ['analytics_storage'],
      marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    },
    waitForUpdate: 500,
    regions: { US: 'granted' },
    adsDataRedaction: true,
  },
});
```

The feature is opt-in; omitting `googleConsentMode` keeps the integration
strict-CSP-safe. Enabling it requires `script-src` to include
`'unsafe-inline'` (or a matching hash) because the default snippet must run
synchronously before any GTM/gtag.js loads.

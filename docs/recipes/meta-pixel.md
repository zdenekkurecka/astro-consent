# Meta Pixel (Facebook Pixel)

Meta Pixel has no Google-Consent-Mode equivalent — the correct pattern is to
block the entire `fbq` init until the user opts in. The `marketing` category
is the conventional mapping.

## Category mapping

| Category    | Purpose                                   |
| ----------- | ----------------------------------------- |
| `marketing` | Meta Pixel init, `PageView`, conversions  |

## Wiring

### 1. Declare the category

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cookieConsent from '@zdenekkurecka/astro-consent';

export default defineConfig({
  integrations: [
    cookieConsent({
      version: 1,
      categories: {
        marketing: {
          label: 'Marketing',
          description: 'Used for targeted advertising.',
          default: false,
        },
      },
    }),
  ],
});
```

### 2. Gate the Pixel snippet

```astro
---
import { ConsentScript } from '@zdenekkurecka/astro-consent/components';
---
<ConsentScript category="marketing">
  {`!function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1234567890');
  fbq('track', 'PageView');`}
</ConsentScript>
```

Everything up to and including `fbq('track', 'PageView')` must be inside the
same gated script — `fbq` is defined by the init snippet, so splitting init
and tracking across two separate `<ConsentScript>` blocks would leave the
tracking call undefined.

### 3. `<noscript>` pixel (optional)

Meta's copy-paste snippet also includes a `<noscript>` image pixel:

```html
<noscript>
  <img
    height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=1234567890&ev=PageView&noscript=1"
    alt=""
  />
</noscript>
```

The `data-cc-*` system only intercepts `<script>` and `<iframe>` tags, so
this `<img>` would fire regardless of consent if you included it as-is.
Recommended options:

- **Omit it.** Most users have JS enabled; the pixel's value for JS-less
  traffic is low and likely not worth the consent complexity.
- **Render it conditionally from a layout.** Set a cookie or check
  `window.astroConsent?.get()?.categories.marketing` and render the
  `<noscript>` block only when consent is granted. Beware: the decision has
  to be made client-side, which means it won't actually help JS-disabled
  users. In practice this just means "don't render it".

## Gotchas

- **Inline snippet requires `'unsafe-inline'`.** Meta's init is inline by
  design, so strict CSP requires either `'unsafe-inline'` or a matching
  hash/nonce. If that's not acceptable, move the init into an external file
  served from your origin and use the `src` form of `<ConsentScript>`
  instead.
- **`fbq` leaks across navigations.** `<ClientRouter />` view transitions
  don't tear the page down. Once `fbq` is initialised on a page load, it
  stays initialised. This is fine; the pixel will just keep working until
  the next real navigation.
- **Revocation is one-way-ish.** `fbq('consent', 'revoke')` exists but does
  not unload the script. If a user revokes marketing, call
  `fbq?.('consent', 'revoke')` from an `astro-consent:change` listener —
  subsequent `fbq('track', …)` calls will be deduped by Meta as
  non-consenting. On the next full page load the script is blocked again.

  ```astro
  <script>
    document.addEventListener('astro-consent:change', (e) => {
      if (!e.detail.categories.marketing) {
        // Revoke — further Pixel events will be discarded by Meta.
        window.fbq?.('consent', 'revoke');
      }
    });
  </script>
  ```

## Deduplication with server-side Conversions API

If you're sending events to both Meta Pixel (client) and the Conversions API
(server), pass a shared `eventID` so Meta can deduplicate. Consent gating
doesn't affect this — just a reminder that the client-side `fbq('track', …)`
call must include `{ eventID }`, and the server call must send the same one.
This isn't consent-specific, but it's the #1 thing people get wrong when
they re-wire their Pixel for consent.

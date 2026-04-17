---
'@zdenekkurecka/astro-consent': minor
---

Declarative script blocking via `data-cc-category` / `data-cc-src`.

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

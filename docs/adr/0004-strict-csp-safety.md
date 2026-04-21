# 0004. Strict-CSP safety via hashed assets

- **Status:** Accepted
- **Date:** 2026-04-21

## Context

Strict `script-src` CSP is a common deployment posture for the kind of
site that cares about consent in the first place. Shipping an inline
`<script>` or `<style>` from the library forces adopters to allow
`'unsafe-inline'`, add a hash, or plumb a nonce through for *our* code —
all real costs they'd pay per deploy.

Astro provides two injection hooks we can use:

- `injectScript('page', <code>)` — bundled with the page entry, emitted as a
  hashed `<script type="module" src="...">`.
- `injectScript('page-ssr', <code>)` — runs during SSR; used for
  `import "...css"` to flow through Astro's CSS extraction as a hashed
  `<link rel="stylesheet">`.
- `injectScript('head-inline', <code>)` — emits a raw inline `<script>` at
  the top of `<head>`. Not CSP-friendly without an allowlist.

## Decision

Ship all library-owned runtime as hashed external assets:

- CSS via `injectScript('page-ssr', 'import "@.../styles/base.css";')`.
- Client runtime via `injectScript('page', 'import "virtual:astro-consent/init";')`
  — the virtual module ([ADR 0009](./0009-virtual-module-config.md))
  produces a real module that Vite emits as a hashed script.

There is exactly **one** permitted exception: the Google Consent Mode v2
default-denied snippet, which must run before any downstream `gtag.js` or
GTM bootstrap and therefore can't be deferred behind a bundled entry. It is
emitted via `injectScript('head-inline', ...)` and only when GCM is enabled
(see [ADR 0005](./0005-google-consent-mode-v2.md)).

## Consequences

- **Positive:** Strict `script-src 'self'` (no `'unsafe-inline'`, no
  per-deploy hashes or nonces for the library) works out of the box for the
  common case.
- **Positive:** No inline `<style>` — styles are subject to the same CSP
  protection as any other asset.
- **Negative:** Adopters who enable GCM on a strict CSP pay the cost of
  the one inline exception — either allowlisting a hash or supplying a
  nonce. Mitigation is tracked in
  [ADR 0010](./0010-csp-options-for-gcm-snippet.md) (publish the snippet
  hash + `googleConsentMode.headInline: false` opt-out); scoped only to
  the `GCM-enabled × nonce-only-CSP` intersection.
- **Neutral:** Config reaching the client must be JSON-serializable
  (see [ADR 0009](./0009-virtual-module-config.md)). The current config
  surface is all data — numbers, strings, plain objects — so this binds
  trivially, and behaviour (callbacks, custom hooks) goes through the
  event model in [ADR 0003](./0003-event-based-consent-api.md), which is
  the right shape for that regardless.

## References

- `packages/astro-consent/src/integration.ts:56-75`
- README §"CSP strategy"
- [ADR 0003 — Event-based consent API](./0003-event-based-consent-api.md)
- [ADR 0005 — Google Consent Mode v2](./0005-google-consent-mode-v2.md)
- [ADR 0009 — Virtual module for config](./0009-virtual-module-config.md)
- [ADR 0010 — CSP options for the GCM v2 snippet](./0010-csp-options-for-gcm-snippet.md)

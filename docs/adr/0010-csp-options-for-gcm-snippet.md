# 0010. CSP options for the GCM v2 head-inline snippet

- **Status:** Proposed
- **Date:** 2026-04-21

## Context

[ADR 0004](./0004-strict-csp-safety.md) sets the rule: no inline scripts
from the library. [ADR 0005](./0005-google-consent-mode-v2.md) carves out
one exception — the GCM v2 default-denied snippet is emitted via
`injectScript('head-inline', …)` because the `gtag('consent','default',…)`
call must run before any downstream gtag/GTM bootstrap, and nothing we
bundle executes early enough in `<head>` to satisfy that ordering.

The net effect: adopters who enable GCM *and* run a strict CSP either
weaken their CSP (add `'unsafe-inline'` — unacceptable), allowlist a
hash, or plumb a nonce through. Today we provide no tooling for either,
so the CSP story in [ADR 0004](./0004-strict-csp-safety.md) effectively
doesn't hold once GCM is turned on.

The options we looked at:

1. **Publish the snippet's SHA-256 hash.** Adopters paste it into their
   CSP as `'sha256-…'`.
2. **Let adopters opt out of the head-inline.** They ship their own
   `gtag('consent','default',…)` with their own nonce or hash; our
   integration keeps validating the mapping, emitting updates on
   consent events, and falling back via `dataLayer`.
3. **Nonce support.** Stamp a configured nonce onto the emitted inline
   `<script>`. Leans on the adopter's SSR / middleware nonce pipeline;
   worth revisiting alongside Astro 5's experimental CSP work.
4. **Move the snippet to an external bundled module.** Removes the
   inline exception entirely but risks a race where GTM loads before our
   bundled module has executed. High blast radius across SSR streaming,
   View Transitions, and `defer`-free ordering.

## Decision

Implement (1) and (2). Defer (3) and (4) to their own future ADRs if
real-world evidence surfaces a need.

Concretely:

- **Hash.** At build time, compute `SHA-256` of the emitted GCM snippet
  and log it once (`[astro-consent] CSP hash for GCM snippet: sha256-…`)
  so adopters can copy it into their CSP header. Also expose it
  programmatically from the integration hook (exact shape TBD in the
  implementing PR — options include a return value from
  `cookieConsent()`, a `logger.info` line, or a virtual module).
- **`headInline: false` opt-out.** Extend
  `GoogleConsentModeConfig` with `headInline?: boolean` (default `true`).
  When `false`, the integration skips
  `injectScript('head-inline', ...)`. Validation, event-driven updates,
  and the `dataLayer` fallback are unchanged — adopters get the runtime
  bridge without the inline snippet.

Nonce and bundled-module paths are explicitly **not** part of this
decision. If an adopter asks for either, that's a new ADR with its own
evidence.

## Consequences

- **Positive:** Covers the two mainstream strict-CSP postures:
  hash-based CSP (use (1)) and nonce-based CSP (use (2) and bring your
  own snippet).
- **Positive:** Keeps the GCM integration useful even when adopters
  can't take our inline snippet — the validation + update bridge is
  where most of the value lives.
- **Positive:** Doesn't prejudge the nonce or external-bundle
  conversations. Small surface, reversible.
- **Negative:** Two solutions instead of one. Docs need to explain when
  to reach for which; some adopters will pick the wrong one on first
  try.
- **Negative:** The hash is deterministic only if the snippet input is
  deterministic. Any future change to `buildGcmDefaultSnippet` shifts
  the hash — adopters have to update their CSP. This is inherent to
  hash-based CSP; document it.
- **Neutral:** (3) and (4) remain on the table as follow-ups if the
  two-option set proves insufficient.

## References

- [ADR 0004 — Strict-CSP safety](./0004-strict-csp-safety.md)
- [ADR 0005 — Google Consent Mode v2](./0005-google-consent-mode-v2.md)
- `packages/astro-consent/src/gcm.ts` — `buildGcmDefaultSnippet`
- `packages/astro-consent/src/integration.ts:69-75` — the
  `injectScript('head-inline', …)` call this ADR carves options around
- [MDN — CSP `script-src` hashes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#hashes)

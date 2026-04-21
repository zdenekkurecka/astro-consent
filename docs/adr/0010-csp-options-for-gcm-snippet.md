# 0010. CSP opt-out for the GCM v2 head-inline snippet

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
weaken their CSP (`'unsafe-inline'` — unacceptable), allowlist a hash,
or plumb a nonce through. Today we offer no escape hatch, so the strict
CSP story in ADR 0004 breaks the moment GCM is enabled.

The full option space:

1. **Publish the snippet's SHA-256 hash** so adopters paste it into CSP.
2. **Opt out of the head-inline** — adopter ships their own
   `gtag('consent','default',…)` with their own nonce or hash; our
   integration keeps validating the mapping and emitting updates via the
   `dataLayer` fallback wired in [ADR 0005](./0005-google-consent-mode-v2.md).
3. **Nonce support** — stamp a configured nonce onto the emitted inline
   `<script>`. Leans on the adopter's SSR / middleware nonce pipeline.
4. **Move the snippet external** — bundled module loaded synchronously
   from `<head>`. Removes the inline exception entirely but opens
   ordering races against downstream gtag/GTM. High blast radius.

## Decision

Implement **(2) only**: one config knob,
`googleConsentMode.headInline: boolean` (default `true`).

- `true` (default): unchanged from today — the inline default-denied
  snippet is injected at the top of `<head>`. Works out of the box for
  adopters on `'unsafe-inline'` or permissive CSP.
- `false`: the integration skips `injectScript('head-inline', ...)`
  entirely. Adopters ship their own `gtag('consent','default',…)` with
  whatever CSP credential their setup requires (nonce or hash).
  Validation, event-driven `gtag('consent','update', …)` dispatches, and
  the `dataLayer` fallback from [ADR 0005](./0005-google-consent-mode-v2.md)
  are unchanged, so the adopter's hand-rolled snippet composes with the
  rest of the integration.

Hash publishing, nonce injection, and external bundling (options 1, 3,
4) are explicitly **not** part of this decision. If a future adopter
cohort surfaces real evidence they need any of those, each gets its own
ADR.

## Consequences

- **Positive:** Universal escape hatch — one knob covers every strict
  CSP posture. Nonce-CSP adopters pass their own nonce via their own
  snippet; hash-CSP adopters hash their own snippet; anyone on
  `'unsafe-inline'` ignores the flag entirely.
- **Positive:** Minimal surface. One boolean in the config, one branch
  in the integration hook, no new side outputs (no build-log hashes, no
  nonce pipelines).
- **Positive:** `dataLayer` fallback from ADR 0005 makes the opt-out
  compose cleanly — `gtag('consent','update',…)` still lands even when
  our snippet never runs.
- **Negative:** Adopters on hash-CSP who would have liked a
  pre-computed hash now compute their own (e.g.
  `printf '%s' "$snippet" | openssl dgst -sha256 -binary | openssl base64`).
  One command; adopters auditing what lands in their CSP are already
  reading the snippet anyway.
- **Negative:** `headInline: false` pushes responsibility onto the
  adopter to get the default-denied snippet right. Mitigated by pointing
  at the existing `buildGcmDefaultSnippet` output as a reference template
  in the README.
- **Neutral:** Options 1, 3, 4 remain on the table. Each is a future
  ADR if the one-knob answer proves insufficient.

## References

- [ADR 0004 — Strict-CSP safety](./0004-strict-csp-safety.md)
- [ADR 0005 — Google Consent Mode v2](./0005-google-consent-mode-v2.md)
- `packages/astro-consent/src/gcm.ts` — `buildGcmDefaultSnippet`
- `packages/astro-consent/src/integration.ts:69-75` — the
  `injectScript('head-inline', …)` call that `headInline: false` will
  gate
- [MDN — CSP `script-src` hashes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#hashes)

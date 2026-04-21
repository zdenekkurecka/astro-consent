# 0005. Google Consent Mode v2 as a first-class opt-in

- **Status:** Proposed
- **Date:** 2026-04-21

## Context

Google's tracking products (GA4, Google Ads, GTM) expect a
`gtag('consent', 'default', …)` call *before* the tracker script runs, and a
`gtag('consent', 'update', …)` on every change. The default call has to be
inline at the top of `<head>` for this ordering to hold.

The integration could leave this entirely to adopters — generic
`astro-consent:consent` / `astro-consent:change` events give them enough
rope. But the snippet is fiddly enough (ordering, signal names, default
values, region overrides) that it's a frequent source of
integration bugs, and GCM is common enough in the target use cases to
justify a first-class surface that keeps the rules in one place.

## Decision

Ship GCM v2 as an opt-in integration surface on the config
(`googleConsentMode: { mapping, defaults?, regions?, … }`):

- A **mapping** from our category keys to GCM signal keys
  (`ad_storage`, `analytics_storage`, …) is validated at build time —
  unknown categories, unknown signals, and malformed defaults throw before
  the site ships.
- An **inline default-denied snippet** is emitted at the top of `<head>` via
  `injectScript('head-inline', …)` so `gtag('consent', 'default', …)` runs
  before any downstream gtag/GTM bootstrap (see
  [ADR 0004](./0004-strict-csp-safety.md) for the CSP trade-off this
  carries).
- On every `astro-consent:consent` / `astro-consent:change`, the client
  emits `gtag('consent', 'update', <payload>)` with **AND semantics**: a
  signal is `granted` only when *every* category mapped to it is granted.
- If `gtag` is missing (CSP stripped the snippet, custom head template),
  the runtime falls back to pushing onto `dataLayer` so a later-loading
  GTM still picks up the update.

## Consequences

- **Positive:** Adopters get correct Google behaviour by declaring a
  category-to-signal mapping — no per-site snippet maintenance.
- **Positive:** Build-time validation prevents typos in signal names from
  silently reaching `gtag`.
- **Negative:** Adds the one permitted inline script (see
  [ADR 0004](./0004-strict-csp-safety.md)).
- **Negative:** Couples astro-consent to Google-specific terminology.
  Mitigated by making the whole block opt-in and orthogonal to the core
  category model.
- **Neutral:** The AND semantics (strictest category wins) matches how
  Google documents the mapping and avoids accidentally granting a signal
  via a lax category.

## References

- `packages/astro-consent/src/gcm.ts` (validation, default snippet,
  update-payload builder)
- `packages/astro-consent/src/integration.ts:69-75` (head-inline injection)
- `packages/astro-consent/src/client.ts:100-125` (runtime bridge + dataLayer
  fallback)
- README §"Google Consent Mode v2"

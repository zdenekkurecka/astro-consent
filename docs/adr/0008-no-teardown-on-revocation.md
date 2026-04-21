# 0008. No teardown on revocation

- **Status:** Proposed
- **Date:** 2026-04-21

## Context

A consent manager should let users withdraw consent as easily as they
gave it. The obvious-looking feature is: on revocation, unload the
trackers that were activated. In practice, that isn't feasible for most
real-world trackers.

Once activated, third-party SDKs typically:

- attach persistent listeners (`beforeunload`, `pagehide`, `visibilitychange`),
- install timers and background fetches,
- set cookies on first-party and third-party domains,
- augment globals (`gtag`, `fbq`, `dataLayer`, `_paq`, …) that other code
  may already be calling,
- load nested scripts we don't control and can't enumerate.

Removing the `<script>` tag or deleting the global does not roll any of
this back — the SDK is, for practical purposes, load-once.

## Decision

The library treats activation as **one-way within a page lifecycle**. Once a
gated script or iframe flips to live, it stays live for the rest of that
page's session.

Revocation takes effect on the **next full navigation** — the stored
consent state is updated immediately, so the next `readConsent()` returns
the new categories and the next page load gates the trackers correctly.

For trackers that *do* expose a teardown affordance (e.g. Meta Pixel's
`fbq('consent', 'revoke')`), adopters drive it themselves from an
`astro-consent:change` listener. The README and recipes document this
pattern per vendor.

## Consequences

- **Positive:** Avoids the "zombie tracker" class of bugs where a
  half-unloaded SDK keeps sending events or corrupts globals.
- **Positive:** Implementation stays simple: activation is a one-shot
  operation with an idempotency marker (`data-cc-activated`).
- **Negative:** A user who revokes mid-session and doesn't navigate
  continues to have already-activated trackers running until the next
  page load. This is a compliance surface adopters need to understand.
- **Neutral:** The constraint is inherited from the third-party ecosystem,
  not from our design — a different architecture wouldn't meaningfully
  change the outcome.

## References

- `packages/astro-consent/src/scripts.ts:17-21` (documented invariant)
- `packages/astro-consent/src/scripts.ts:54-87` (`data-cc-activated`
  marker)
- `docs/recipes/README.md` ("A note on revocation")
- `docs/recipes/meta-pixel.md` (vendor-driven teardown example)
- README §"Revocation caveat" (line 474)

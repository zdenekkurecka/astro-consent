# 0008. No teardown on revocation

- **Status:** Accepted
- **Date:** 2026-04-21

## Context

A consent manager must allow users to withdraw consent as easily as they
gave it. The obvious-looking feature is: on revocation, unload the trackers
that were activated. In practice, that's infeasible for most real
trackers.

Once activated, third-party SDKs typically:

- attach persistent listeners (`beforeunload`, `pagehide`, `visibilitychange`),
- install timers and background fetches,
- set cookies on first-party and third-party domains,
- augment globals (`gtag`, `fbq`, `dataLayer`, `_paq`, …) that other code
  may already be calling,
- load nested scripts we don't control and can't enumerate.

Removing the `<script>` tag or deleting the global does not roll any of
this back, and half-unloading produces exotic failures (e.g. listeners
still fire but reference a now-undefined `gtag`).

## Decision

The library treats activation as **one-way within a page lifecycle**. Once a
gated script or iframe flips to live, it stays live for the rest of that
page's session.

Revocation takes effect on the **next full navigation** — the stored
consent state is updated immediately, so the next `readConsent()` returns
the new categories, and the next page load gates the trackers correctly.

Adopters who need hard revocation within the session can listen for
`astro-consent:change` and call `location.reload()`. This is documented as
a caveat in the README and in the recipes.

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
- README §"Revocation"

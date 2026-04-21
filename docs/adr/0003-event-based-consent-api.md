# 0003. Event-based consent API on `document`

- **Status:** Accepted
- **Date:** 2026-04-21

## Context

Adopters need a hook for custom behaviour on consent decisions — e.g. load a
tracker that needs a JS bootstrap, push a custom dataLayer event, toggle UI
state. The integration config is authored in `astro.config.*`, which runs at
build time, so anything passed there must survive serialization into a
virtual module.

Functions do not survive that round-trip in any useful way:
`Function.prototype.toString` produces source that can be re-parsed, but the
resulting closure has no access to the caller's module scope, imports, or
outer state. This rules out a callback-style API
(`cookieConsent({ onConsent: (state) => loadAnalytics() })`) for anything
but trivial cases.

## Decision

Expose the consent lifecycle as `CustomEvent`s dispatched on `document`:

- `astro-consent:consent` — fires once per page-load session once consent is
  present (either freshly granted or already stored). `detail` is the full
  `ConsentState`.
- `astro-consent:change` — fires on every subsequent update after the
  initial consent.

Adopters subscribe from normal `<script>` tags (or modules), where closures,
imports, and framework-specific APIs are all available.

The event names are exported as `CONSENT_EVENT` / `CHANGE_EVENT` constants
from the package entrypoint so TypeScript users can import them.

## Consequences

- **Positive:** Subscribers keep full module scope — the use case that
  motivates a callback API works natively.
- **Positive:** Decouples the runtime from the build-time config: the
  runtime only needs to dispatch an event, not own a serialized callback
  list.
- **Positive:** The library's own subsystems (script blocker, GCM bridge)
  consume the same events, so there's one integration point rather than
  two code paths.
- **Negative:** Subscribers registered *after* the initial
  `astro-consent:consent` has fired will miss it. Adopters can poll the
  current state via `window.astroConsent.get()` as a fallback.
- **Negative:** The "once per session" guarantee for
  `astro-consent:consent` is managed by a module-level
  `consentFiredThisSession` flag, which must be respected by any new code
  path that emits (see [ADR 0006](./0006-view-transitions-dual-init.md)).

## Why not other shapes

- **Serialized callbacks in the config.** Closure loss (see Context) —
  the common use case of "call this imported function" doesn't survive.
- **A bespoke `window.astroConsent.on(...)` pub/sub.** Equivalent
  semantics to DOM events, but `addEventListener` is already the
  lingua-franca for this pattern and shows up in DevTools out of the box.

## References

- `packages/astro-consent/src/client.ts:60-73` (emit helper with rationale)
- `packages/astro-consent/src/types.ts:390-409` (event-name constants)
- README §"Event-based hook (advanced / full control)"

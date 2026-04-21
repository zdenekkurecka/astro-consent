# 0002. Declarative script blocking via `type="text/plain"`

- **Status:** Accepted
- **Date:** 2026-04-21

## Context

Third-party tags (analytics, ads, embeds) must not execute before the user
grants the matching consent category. Adopters drop these as `<script>` tags
inside Astro components, partials, CMS content, and MDX — a pattern the
library can't control or rewrite.

We need a gating mechanism that:

1. Works with any tracker that takes a `<script>` tag — no per-vendor glue.
2. Is inert in the HTML until we explicitly activate it (no race where the
   browser fetches the tracker before our gate runs).
3. Survives SSR and static output — the gating state must be visible in the
   markup, not assembled at runtime.
4. Handles SPA-style navigation (Astro View Transitions) and ad-hoc DOM
   insertion.
5. Plays nicely with strict CSP (see [ADR 0004](./0004-strict-csp-safety.md)).

## Decision

Gate scripts and iframes with a declarative marker the browser already treats
as inert, then swap them for live elements once consent is granted.

- `<script type="text/plain" data-cc-category="<key>" data-cc-src="<url>">` —
  the browser does not execute a non-JS MIME type, so the script never runs
  until we replace it with a fresh `<script>` and copy `data-cc-src` into
  `src`.
- `<iframe data-cc-category="<key>" data-cc-src="<url>">` with no `src` —
  the browser does not load a `src`-less iframe.
- Activation copies `nonce` via the `.nonce` IDL property (not
  `getAttribute`), since CSP L3 hides the content attribute post-parse.
- A `MutationObserver` rooted at `document.documentElement` activates
  matching elements inserted after the initial scan.

The [`<ConsentScript>`](../../packages/astro-consent/src/components/ConsentScript.astro)
Astro component is sugar that emits exactly this markup, so hand-written tags
and the component are interchangeable.

## Consequences

- **Positive:** Vendor-agnostic — any `<script>`-based tracker slots in.
- **Positive:** SSR/static friendly — the gate is part of the rendered HTML.
- **Positive:** Zero-JS path when consent is already granted: a single DOM
  scan at `astro-consent:consent` time is all that's needed.
- **Negative:** Activation is one-way within the page (see
  [ADR 0008](./0008-no-teardown-on-revocation.md)).
- **Negative:** Inline script bodies (no `data-cc-src`) require
  `'unsafe-inline'` or a CSP nonce once activated. We document this and
  prefer the external form.
- **Neutral:** `data-cc-category` is also used on `[role="switch"]` elements
  inside the banner/modal; the script selector is scoped with
  `script[type="text/plain"]` and `iframe[...]:not([src])` to avoid
  collision.

## Alternatives considered

- **Runtime injection via `document.createElement('script')`.** Requires
  adopters to move tracker snippets into JS modules and import them
  conditionally — a significant change to established patterns and a
  blocker for CMS/MDX-authored trackers.
- **Fetch interception / service worker.** Over-complicated for the problem;
  wouldn't cover inline scripts.
- **Server-side filtering.** Works for SSR but not for static output and
  leaks the adopter's tracker list to the server.

## References

- `packages/astro-consent/src/scripts.ts:1-154`
- `packages/astro-consent/src/components/ConsentScript.astro`
- [ADR 0004 — Strict-CSP safety](./0004-strict-csp-safety.md)
- [ADR 0008 — No teardown on revocation](./0008-no-teardown-on-revocation.md)

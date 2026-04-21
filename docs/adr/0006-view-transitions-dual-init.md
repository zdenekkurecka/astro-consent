# 0006. Dual init for View Transitions and classic navigation

- **Status:** Proposed
- **Date:** 2026-04-21

## Context

Astro supports two navigation models:

- **View Transitions enabled** — initial `DOMContentLoaded` fires once;
  subsequent navigations swap the DOM without a new page load. Astro emits
  `astro:page-load` on every navigation, including the first.
- **Classic navigation** — `DOMContentLoaded` fires on every page load;
  `astro:page-load` never fires.

The consent runtime must initialize in both models. Binding only to
`astro:page-load` breaks classic sites; binding only to `DOMContentLoaded`
leaves the modal unmounted after a View Transitions navigation that swaps
the banner markup out of the DOM.

An additional constraint: some work (event delegation, `MutationObserver`,
the once-per-session `astro-consent:consent` emit) must *not* repeat across
View Transitions navigations, or handlers accumulate and the consent event
fires on every page.

## Decision

The generated init module subscribes to **both** events and calls
`initConsentManager(config)` from each handler:

```js
document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
```

`initConsentManager` is idempotent by design. Three module-level flags
guard work that must happen at most once per page lifecycle:

- `listenerAttached` — the click/keydown delegation on `document`.
- `scriptBlockerAttached` — the `MutationObserver` and consent→activate
  wiring.
- `consentFiredThisSession` — whether `astro-consent:consent` has fired for
  this page load (re-fire is disallowed; only `astro-consent:change`
  follows).

UI re-injection (`injectUI`) is itself idempotent and *does* run per
navigation, which restores the banner/modal markup after a View Transition
swap.

## Consequences

- **Positive:** One build works on both VT and non-VT sites without adopter
  configuration.
- **Positive:** The guards are named for the invariant they protect, making
  the contract explicit for future maintainers.
- **Negative:** Any new init code path must decide, deliberately, whether
  it belongs behind one of the guards. Easy to get wrong without reading
  the comments.

## References

- `packages/astro-consent/src/virtual-config.ts:35-55` (dual-event wiring
  in the generated init module)
- `packages/astro-consent/src/client.ts:55-58` (guard flags)
- `packages/astro-consent/src/client.ts:143-152` (once-per-session emit)

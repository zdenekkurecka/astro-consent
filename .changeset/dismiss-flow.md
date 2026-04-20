---
'@zdenekkurecka/astro-consent': minor
---

Animated dismiss confirmation: after Accept / Reject / Save, the banner or modal now collapses with a per-variant animation (lift + scale + blur for bar / cloud / popup / modal, slide-to-corner for box) and a short success toast appears at the bottom-centre with the outcome headline. Honours `prefers-reduced-motion` — the collapse reduces to a 150ms opacity fade and the toast appears without its entry animation.

Three new `text.*` keys customise the toast copy: `toastAccepted` (`"All cookies accepted"`), `toastRejected` (`"Only essential cookies"`), and `toastSaved` (`"Preferences saved"`). All three can also be placed inside a `localeText` entry for per-locale overrides.

The toast is rendered as `<div role="status" aria-live="polite">` so assistive tech announces the outcome without stealing focus. No new events are emitted — the existing `astro-consent:consent` / `astro-consent:change` still fire at the moment the dismiss animation begins, so listeners see no added delay.

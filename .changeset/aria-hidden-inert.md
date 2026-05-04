---
'@zdenekkurecka/astro-consent': patch
---

`#cc-banner` and `#cc-modal` now pair `aria-hidden` with the `inert` attribute so they no longer trip the axe `aria-hidden-focus` rule (flagged by Vercel's live accessibility audit). Previously both containers shipped with `aria-hidden="true"` but kept their action buttons / toggles in the tab order, so keyboard users could focus invisible buttons and AT-aware audits failed. `inert` is added on hide and removed on show, in lock-step with `aria-hidden`. Browsers without `inert` support fall back to the existing aria-hidden-only behavior.

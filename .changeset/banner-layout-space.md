---
'@zdenekkurecka/astro-consent': patch
---

Banner now reserves real layout space at the bottom of the host page so it no longer overlays footers and bottom CTAs. The runtime measures the banner on show (and re-measures via `ResizeObserver` when it wraps on narrow viewports), publishing the size as `--cc-banner-height` on `:root`. Default zero-specificity rules consume the var as `padding-bottom` on `body` and `scroll-padding-bottom` on `:root`, both no-ops when the banner isn't visible. The padding transition matches the banner's existing 0.3s ease so the show/hide animates cleanly.

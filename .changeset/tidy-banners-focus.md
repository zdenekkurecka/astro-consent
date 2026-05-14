---
"@zdenekkurecka/astro-consent": patch
---

Fix accessibility warning when dismissing the banner or modal. Accepting/rejecting consent directly from the banner left focus on the just-clicked button while `aria-hidden`/`inert` were applied to its ancestor, hiding a focused node from assistive tech and logging a console warning. `hideBanner()` and `hideModal()` now move focus out of the subtree before hiding it.

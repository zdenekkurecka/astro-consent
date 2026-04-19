---
'@zdenekkurecka/astro-consent': patch
---

Internal refactor: derive surface, aura, stroke, text, and primary-hover tokens from three inputs (`--cc-primary`, `--cc-tone`, `--cc-text`) via `color-mix()`. Rebranding the card now touches three tokens instead of ten; every previously shipped token remains overridable as an escape hatch. No visual change and no config surface change.

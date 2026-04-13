---
'@zdenekkurecka/astro-consent': minor
---

Add `storageKey` config option to override the localStorage key used to persist consent. Prevents collisions when multiple Astro apps share a single origin (e.g. `example.com/docs` and `example.com/app`). Defaults to `"astro-consent"`.

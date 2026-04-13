---
'@zdenekkurecka/astro-consent': minor
---

Add `maxAgeDays` config option to expire stored consent after N days and re-prompt the user. Useful for aligning with GDPR/DPA guidance that recommends re-asking for consent every 6–12 months. Defaults to `undefined` (no expiry).

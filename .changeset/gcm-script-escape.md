---
'@zdenekkurecka/astro-consent': patch
---

GCM default snippet now escapes `</` in serialized JSON, preventing early termination of the inline `<script>` if an integration-author-supplied value (e.g. a `regions` key) contains the literal `</script>` sequence. Inputs come from `astro.config.*` rather than end users, so the risk is low — but inline-script escaping is the right default for defense-in-depth.

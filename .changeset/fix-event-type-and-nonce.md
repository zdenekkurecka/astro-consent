---
'@zdenekkurecka/astro-consent': patch
---

Fix two regressions surfaced during the v0.3.0 code review:

- **Event type on re-accept/re-reject.** When a user re-opened the banner
  or preferences modal after already consenting (e.g. via
  `window.astroConsent.show()` / `showPreferences()`) and clicked
  "Accept all" / "Reject all", the integration dispatched
  `astro-consent:consent` again instead of `astro-consent:change`. The
  `save-preferences` path already discriminated correctly; the two
  accept/reject branches now follow the same rule.

- **CSP nonce lost on script activation.** Declarative blocking cloned
  placeholder `<script>` elements via `getAttribute`/`setAttribute`, but
  CSP L3 hides the `nonce` content attribute post-parse so the copy
  landed as an empty string and the activated script was blocked by a
  nonce'd CSP. The runtime now copies the nonce via the `.nonce` IDL
  property so the injected script matches the page policy.

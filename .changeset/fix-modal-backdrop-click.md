---
"@zdenekkurecka/astro-consent": patch
---

Fix preferences modal not closing when clicking the dimmed backdrop. The `.cc-modal` wrapper spans the full viewport above `.cc-overlay`, so real user clicks on the dimmed area always landed on `#cc-modal` — never on `#cc-overlay` — and the close handler never fired. The handler now matches `#cc-modal` as the click target, and the Playwright coverage was updated to click the backdrop positionally instead of dispatching on the overlay element.

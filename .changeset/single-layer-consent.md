---
'@zdenekkurecka/astro-consent': minor
---

Single-layer consent flow: category toggles can now be rendered directly on the banner, eliminating the modal click for sites with few categories.

```ts
cookieConsent({
  version: 1,
  categories: { /* ... */ },
  ui: {
    banner: {
      layout: 'cloud',
      categoriesOnBanner: true,
    },
  },
});
```

The banner starts collapsed. Clicking **Customize** expands it in place, revealing the toggles and morphing the action labels (Customize ↔ Hide preferences, Accept all ↔ Save preferences). The "Reject optional" button fades and collapses to zero width once expanded — it's redundant when the user has direct switch control.

A new `×` close button (label: `text.dismissAriaLabel`) lets the user dismiss the banner without recording consent; it returns on the next page load.

`window.astroConsent.showPreferences()` flips the banner into expanded mode instead of opening the modal — the modal is not injected at all in single-layer mode.

Layout fit:

| Layout  | Recommended for single-layer? |
| ------- | ----------------------------- |
| `cloud` | yes                           |
| `popup` | yes                           |
| `bar`   | works, tighter                |
| `box`   | not recommended (too narrow)  |

New text keys: `hidePreferences` (default `"Hide preferences"`) and `dismissAriaLabel` (default `"Dismiss"`). Behavior with `categoriesOnBanner: false` is unchanged.

Closes #44.

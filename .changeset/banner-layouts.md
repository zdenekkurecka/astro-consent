---
'@zdenekkurecka/astro-consent': minor
---

Four banner layout variants — `bar`, `box`, `cloud`, `popup` — with configurable position. Default remains `bar` + `bottom`, so existing installations don't shift visually after upgrade.

```ts
cookieConsent({
  version: 1,
  categories: { /* ... */ },
  ui: {
    banner: {
      layout: 'box',          // 'bar' | 'box' | 'cloud' | 'popup'
      position: 'bottom-right',
      scrim: false,           // cloud-only passthrough; popup always on, bar/box always off
    },
  },
});
```

Position validity per layout — invalid combinations fall back to the layout's default and emit a `console.warn` in dev:

| Layout  | Valid positions                                            |
| ------- | ---------------------------------------------------------- |
| `bar`   | `top`, `bottom`                                            |
| `box`   | `top-left`, `top-right`, `bottom-left`, `bottom-right`     |
| `cloud` | `top`, `bottom`                                            |
| `popup` | `center`                                                   |

New CSS custom properties: `--cc-banner-max-width`, `--cc-box-width`, `--cc-popup-width`, `--cc-banner-offset`. All layouts are driven by `data-cc-layout` / `data-cc-position` / `data-cc-scrim` attributes on the banner root, so consumers can override layouts with their own CSS without forking the integration.

Closes #39.

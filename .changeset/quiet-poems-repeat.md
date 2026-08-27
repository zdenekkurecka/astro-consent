---
'@zdenekkurecka/astro-consent': patch
---

Fix three reported defects: the Google Consent Mode placement claim, the
preference toggle's contrast, and the missing `essentialBadge` docs.

**Google Consent Mode snippet placement was documented wrong ([#115](https://github.com/zdenekkurecka/astro-consent/issues/115)).**
The README, the `googleConsentMode` doc comments (which ship in `dist/types.d.ts`
and surface as editor tooltips), `docs/recipes/gtm.md` and `docs/recipes/ga4.md`
all claimed the default-denied snippet is injected "at the top of `<head>`". It
isn't — Astro emits injected `head-inline` scripts *after* the route's own
`<head>` content, so the snippet is the **last** thing in `<head>`. A loader
authored in your layout's `<head>`, which both recipes told you to do, therefore
ran *before* the consent default.

The recipes now place the Google tag at the top of `<body>`, which is ordered
after the whole of `<head>` and so is genuinely guaranteed, and document
injecting it from an integration listed after `cookieConsent()` as the
in-`<head>` alternative. The README's GA4 example was additionally broken on its
own terms: it called bare `gtag('js', …)` / `gtag('config', …)` without
bootstrapping `window.dataLayer` and `gtag`, so following the old "drop it
anywhere in your layout" advice into `<head>` threw
`ReferenceError: gtag is not defined` and dropped the GA4 config entirely.

No runtime behaviour changed — the snippet lands where it always did, and still
precedes everything in `<body>`.

**Preference toggle failed WCAG 2.1 SC 1.4.11 in the off state ([#116](https://github.com/zdenekkurecka/astro-consent/issues/116)).**
`.cc-toggle-slider` painted its off-state track with `--cc-border` and its knob
with hard-coded `white`, giving **1.18:1** track-vs-backdrop and **1.23:1**
knob-vs-track in the light palette — no boundary anywhere near the required 3:1,
so the control was effectively invisible to low-vision users. `--cc-border` also
draws the banner hairline, the `.cc-badge` outline and the secondary button's
border and hover fill, so overriding it could not fix the toggle without
wrecking those.

The toggle now has its own tokens, `--cc-toggle-off` and `--cc-toggle-knob`, so
the two readings no longer compete. Defaults clear 3:1 on both boundaries in
both palettes, measured against the `.cc-category` card the toggle actually sits
on rather than `--cc-bg`:

| | track vs card | knob vs track |
| --- | --- | --- |
| light `#64748b` | 4.56:1 | 4.76:1 |
| dark `#7a8699` | 3.75:1 | 3.69:1 |

Consumers already overriding `--cc-border` keep their hairline; override
`--cc-toggle-off` to restyle the toggle.

**`essentialBadge` was undocumented ([#117](https://github.com/zdenekkurecka/astro-consent/issues/117)).**
The key appeared nowhere in the README — not in the `ConsentText` reference
block and not in the localization example — so anyone translating from those
shipped a stray English "Required" pill next to a fully translated Essential
row. Both places now list it.

Also adds regression coverage for the first two: the e2e suite now asserts the
GCM snippet precedes everything in `<body>` and that the consent default is
queued ahead of the page's own `gtag` calls, and checks the toggle's contrast
ratios in both the light and dark palettes.

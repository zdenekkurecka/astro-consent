---
'@zdenekkurecka/astro-consent': patch
---

Make the bottom banner's content width themeable via `--cc-banner-max-width`
and `--cc-banner-text-min-width`.

`.cc-banner-inner` capped its centered content at a hard-coded `72rem`, and
`.cc-banner-text` held a hard-coded `min-width: 280px`. Both are now custom
properties defaulting to those same values, so the rendered result is
unchanged.

Every other visual knob in this package is already a `--cc-*` token whose
default is declared at zero specificity inside `:where(:root)` — the reason a
consumer's `:root { --cc-primary: … }` reliably wins without `!important`.
Width was the one dimension that escaped that convention, so matching the bar
to a site's own grid meant overriding `.cc-banner-inner` directly. That is a
class-vs-class tie at equal specificity, decided by stylesheet source order,
and consumers do not control that order: the base stylesheet is injected via
`injectScript('page-ssr', …)` and Astro decides where the resulting `<link>`
lands relative to their own. In practice that pushed people to `!important` or
a specificity hack, and pinned them to a class name this package treats as
internal.

```css
:root {
  --cc-banner-max-width: 80rem; /* or `none` for a full-bleed bar */
  --cc-banner-text-min-width: 200px;
}
```

The two tokens are documented together because they interact: the banner's
message and its buttons share a row only while the content box is wider than
both combined, so narrowing the bar while leaving the text floor at `280px`
makes the buttons wrap onto their own row sooner than the chosen width
suggests.

Deliberately a CSS token rather than a `ui.*` config option: an option would
have to emit an inline `style` attribute, which would break the `style-src
'self'` guarantee the README makes for strict Content Security Policies.

Covered by a new e2e spec that pins the defaults to the values the literals
rendered, overrides both tokens through a stylesheet rather than an inline
style so the cascade against the injected sheet is what is actually asserted,
and derives the wrap threshold from the measured button width rather than
hard-coding a number that moves with the playground's labels.

# Recipes

Copy-paste wiring for the trackers developers most often ask about. Each recipe
builds on the primitives documented in the main
[README](../../README.md) — declarative `<ConsentScript>` / `data-cc-*`
blocking, the `astro-consent:consent` / `astro-consent:change` events, and the
`googleConsentMode` integration option. The recipes just pick the right tool
for each tracker and call out the tracker-specific gotchas.

| Tracker                 | Typical category | Recipe                         |
| ----------------------- | ---------------- | ------------------------------ |
| Google Analytics 4      | `analytics`      | [ga4.md](./ga4.md)             |
| Google Tag Manager      | `analytics` (+ GCM) | [gtm.md](./gtm.md)         |
| Meta Pixel (Facebook)   | `marketing`      | [meta-pixel.md](./meta-pixel.md) |

> **Category naming.** Category keys are yours to define. The recipes assume
> `analytics` and `marketing` to match the examples in the main README — if
> your config uses different keys, substitute them everywhere.

## Which pattern should I use?

- **Declarative `<ConsentScript>`** — default choice. Works for any tracker
  that just needs its `<script>` tag to execute once consent is granted. Keeps
  the wiring in the markup, no glue code.
- **Google Consent Mode v2** (`googleConsentMode` config) — *always* use this
  for Google tags (GA4, Google Ads, GTM). It sends denied-by-default signals
  so Google tags can run in a consent-aware degraded mode before opt-in, and
  lets you drop the gtag / GTM snippet without wrapping it in a consent gate.
- **Event-based hook** — reach for this when you need custom bootstrap logic,
  dynamic config, or teardown on revocation. See
  [the README](../../README.md#event-based-hook-advanced--full-control) for
  the pattern.

## A note on revocation

Once a tracker's script has executed, the integration can't unload it — most
trackers are not teardown-safe. The next full page load will keep the script
blocked once the user revokes, but the current session still has it running.
The individual recipes call this out where it matters.

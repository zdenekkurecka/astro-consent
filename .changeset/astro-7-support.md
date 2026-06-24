---
"@zdenekkurecka/astro-consent": patch
---

Add support for Astro 7. The peer dependency range is now `astro@^5 || ^6 || ^7`.

No integration code changes were required — Astro 7's integration API surface this package relies on is unchanged: the `astro:config:setup` hook, the `injectScript` stages (`page-ssr`, `page`, `head-inline`), `updateConfig` Vite-plugin registration, the `astro:page-load` client event (View Transitions), and the `astro/runtime/server` type path all carry over. The virtual-module Vite plugin resolves correctly under Astro 7's Vite 8 / Rolldown bundler, and the full Playwright e2e suite passes against Astro 7.

Note: Astro 7 itself requires Node `>=22.12.0` (it dropped Node 18 and 20). This package keeps a permissive `engines.node >=18.17.0` so Astro 5/6 users on older Node are unaffected; projects on Astro 7 must run Node `>=22.12.0`, as enforced by Astro.

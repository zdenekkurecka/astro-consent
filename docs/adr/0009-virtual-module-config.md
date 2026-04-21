# 0009. Virtual module for build-to-runtime config

- **Status:** Accepted
- **Date:** 2026-04-21

## Context

Integration config (`cookieConsent({ version, categories, text, … })`) is
authored in `astro.config.*`, which runs at build time in Node. The
consent runtime, in contrast, runs in the browser and needs the same
config as input.

The bridge between the two has several viable shapes:

1. **Data attribute / global.** Stamp the config as JSON into
   `<script>window.__astroConsentConfig = …</script>`. Works but requires
   an inline `<script>` (defeats [ADR 0004](./0004-strict-csp-safety.md)).
2. **Public asset.** Write the serialized config to
   `public/astro-consent-config.json` and `fetch()` it at runtime. Adds a
   network round-trip and mutates the adopter's `public/` directory.
3. **Module graph via Vite virtual modules.** Expose `virtual:…` specifiers
   that resolve to synthetic modules emitted by a Vite plugin. The
   bundler treats the config as a normal import; no inline code, no
   extra fetches.

The runtime also needs to resolve the client entry by package name so the
emitted import strings don't bake absolute filesystem paths into the
adopter's build.

## Decision

Expose two virtual modules via a Vite plugin registered from the
integration:

- `virtual:astro-consent/config` — evaluates to
  `export default <JSON.stringify(config)>`.
- `virtual:astro-consent/init` — a small generated module that imports the
  config from the above, imports `initConsentManager` from
  `@zdenekkurecka/astro-consent/client` (the package's public bare
  specifier), and wires the dual-init events
  (see [ADR 0006](./0006-view-transitions-dual-init.md)).

The integration hook calls
`injectScript('page', 'import "virtual:astro-consent/init";')`, letting
Astro emit a hashed `<script type="module" src="...">` for the whole thing.

## Consequences

- **Positive:** No inline `<script>` for config — keeps the strict-CSP
  story from [ADR 0004](./0004-strict-csp-safety.md) intact.
- **Positive:** Config travels through Vite's normal module pipeline —
  HMR, tree-shaking, and source maps all work without custom plumbing.
- **Positive:** Importing the client by bare specifier means the runtime
  is decoupled from the on-disk `dist/` layout of the package. Works the
  same way in a monorepo pnpm link as in a published install.
- **Negative:** Every config value must be JSON-serializable — no
  functions, regexes, classes. This cascades into the API design (see
  [ADR 0003](./0003-event-based-consent-api.md) for why that's actually
  the right constraint).
- **Negative:** Ties the integration to Vite — fine today because Astro
  *is* Vite, but an ADR to revisit if Astro ever supports alternative
  bundlers.

## References

- `packages/astro-consent/src/virtual-config.ts` (plugin + generated init)
- `packages/astro-consent/src/integration.ts:49-67` (plugin registration
  and `injectScript` call)
- [ADR 0003 — Event-based consent API](./0003-event-based-consent-api.md)
- [ADR 0004 — Strict-CSP safety](./0004-strict-csp-safety.md)
- [ADR 0006 — Dual init](./0006-view-transitions-dual-init.md)

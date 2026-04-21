# 0007. Category-based consent state with implicit `essential`

- **Status:** Proposed
- **Date:** 2026-04-21

## Context

GDPR and ePrivacy require per-purpose consent: users grant or deny specific
categories (analytics, marketing, …) rather than a single global flag.
Regulators and DPAs generally treat "strictly necessary" cookies as exempt
from consent, but they must still be acknowledged in the UI.

The library also needs to:

- Let adopters define *their own* category keys — the set of meaningful
  categories differs per site.
- Handle policy changes (new category added, purpose of existing category
  changed) by re-prompting users.
- Handle time-bounded consent (some jurisdictions expect re-prompting after
  N days) without forcing a re-prompt on every page load.

## Decision

Represent stored consent as:

```ts
interface ConsentState {
  version: number;                      // matches config.version at time of save
  timestamp: number;                    // Date.now() at save
  categories: Record<string, boolean>;  // user-defined keys + implicit 'essential': true
}
```

- **`essential` is always `true`.** It is added implicitly on every write
  path (`acceptAll`, `rejectAll`, `savePreferences`, `api.set`). Adopters
  don't declare it as a category; it's a property of the state shape.
- **`version` is adopter-controlled.** Bumping
  `cookieConsent({ version: N })` in `astro.config.*` invalidates stored
  consent whose `version < N` and re-shows the banner — the re-prompt
  lever for policy changes.
- **`maxAgeDays` is optional.** When set, consent older than the threshold
  is treated as missing; triggers a re-prompt without a version bump.
- **Category keys are opaque to the library.** The recipes documentation
  uses `analytics` and `marketing` as conventions, but nothing in the
  runtime hard-codes them.

## Consequences

- **Positive:** Adopters model categories that fit their site's tracker
  inventory.
- **Positive:** Re-prompting is a one-line config change (`version` bump)
  or a declarative policy (`maxAgeDays`), not a bespoke migration.
- **Positive:** `essential: true` being non-negotiable in the stored state
  prevents a user API call from accidentally "denying" the category — the
  write-through always restores it.
- **Negative:** Category keys are a stringly-typed contract. Mitigated by
  the `ConsentCategoryKey` marker interface (see `types.ts`) that
  adopters can augment with their typed keys.

## References

- `packages/astro-consent/src/consent.ts:50-87` (state shape + write paths)
- `packages/astro-consent/src/types.ts` (`ConsentState`,
  `ConsentCategoryKey`)
- README §"Category config" and §"Versioning & re-prompting"

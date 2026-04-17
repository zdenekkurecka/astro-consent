---
'@zdenekkurecka/astro-consent': minor
---

Typed event listeners and runtime API via `ConsentKeys` augmentation.

Drop a project-level `.d.ts` to make every `astro-consent:consent` /
`:change` listener and `window.astroConsent` narrow to your declared
category keys:

```ts
// src/astro-consent.d.ts
declare module '@zdenekkurecka/astro-consent' {
  interface ConsentKeys {
    analytics: true;
    marketing: true;
  }
}
export {};
```

With the augmentation in place, `e.detail.categories.analyitcs` and
`window.astroConsent?.set({ analyitcs: true })` become compile-time errors,
and autocompletion suggests the declared keys. Without it, both fall back
to `Record<string, boolean>` — same behaviour as before.

Also re-exports `ConsentEvent`, `ConsentKeys`, `ResolvedConsentKeys`,
`CONSENT_EVENT`, and `CHANGE_EVENT` from the package entry so consumers
don't need to import from internal paths.

Closes #70, #71.

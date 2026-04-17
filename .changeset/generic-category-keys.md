---
'@zdenekkurecka/astro-consent': minor
---

Type-safe category keys via generic config.

`ConsentConfig`, `ConsentState`, and `ConsentText` now take an optional
`K extends string` generic that narrows `categories` (and `text.categories`)
to the literal keys you defined. When you pass a config to `cookieConsent`,
TypeScript infers `K` from the `categories` map — so typos in downstream
lookups are caught and autocompletion suggests the right keys.

```ts
const config = {
  version: 1,
  categories: {
    analytics: { label: 'Analytics', description: '…', default: false },
    marketing: { label: 'Marketing', description: '…', default: false },
  },
} satisfies ConsentConfig<'analytics' | 'marketing'>;

// state.categories.analyitcs → type error, with a "did you mean 'analytics'?" hint
```

The generic defaults to `string`, so existing code keeps compiling unchanged.
End-to-end typing of the `astro-consent:consent` / `:change` event payload
still requires a user-land `declare module` augmentation (the Vite virtual
module boundary erases the generic); that is tracked as a follow-up.

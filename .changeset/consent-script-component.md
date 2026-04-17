---
'@zdenekkurecka/astro-consent': minor
---

Added `<ConsentScript>` Astro component for category-gated scripts.

Ship at `@zdenekkurecka/astro-consent/components`, wraps the existing
`type="text/plain"` + `data-cc-category` markup with a named-prop API that
the declarative blocking runtime already knows how to activate.

```astro
---
import { ConsentScript } from '@zdenekkurecka/astro-consent/components';
---

<!-- External — renders as type="text/plain" with data-cc-src -->
<ConsentScript
  category="analytics"
  src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
  async
/>

<!-- Inline — slot content becomes the script body -->
<ConsentScript category="analytics">
  {`gtag('js', new Date()); gtag('config', 'G-XXX');`}
</ConsentScript>
```

Any other `<script>` attributes (`defer`, `nonce`, `integrity`, `crossorigin`,
…) pass through to the placeholder and survive activation. `is:inline` is
applied automatically so Astro leaves the placeholder markup intact.

Closes #21.

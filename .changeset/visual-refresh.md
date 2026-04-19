---
'@zdenekkurecka/astro-consent': minor
---

Visual design refresh: layered card surface with backdrop blur, custom switch component, category badges (Required / Optional), and `prefers-reduced-motion` support.

New design tokens extend the existing palette — `--cc-surface-2`, `--cc-stroke-2`, `--cc-text-dim`, `--cc-text-mute`, `--cc-accent-ink`, `--cc-aura-1`, `--cc-aura-2`, `--cc-radius-sm`, `--cc-radius-xs`, and `--cc-shadow-card` — all shipped as hex (including 8-digit hex for alpha) with light and dark defaults.

**Changed.** Category toggles now render as `<div role="switch" aria-checked="…" data-cc-category="…">` instead of a hidden `<input type="checkbox">` inside a `<label class="cc-toggle">`. Consumers who deep-style the toggle with `.cc-toggle input[type="checkbox"]` / `.cc-toggle-slider` selectors must migrate to `.cc-switch` / `.cc-switch[aria-checked="true"]`. Keyboard behaviour is preserved: `Space` / `Enter` flip the switch. `aria-disabled="true"` replaces `disabled` on the locked essential category.

Two new text keys — `text.badgeRequired` (default `"Required"`) and `text.badgeOptional` (default `"Optional"`) — control the category badges. The existing `text.essentialBadge` is now deprecated and kept as a fallback for `badgeRequired` only, so existing configs keep rendering the same label.

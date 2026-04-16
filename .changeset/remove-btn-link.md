---
'@zdenekkurecka/astro-consent': patch
---

UI polish across the banner and preferences modal:

- Button hierarchy: Accept all and Reject all are now both primary; Manage preferences and Save preferences are secondary. On mobile (≤480px) the two primary actions share the top row and the third button spans full-width below.
- Modal: border removed, corners rounded, close button refined, and footer spacing made symmetric.
- Surfaces: tint-based backgrounds with larger corner radii applied consistently across banner, modal, and category cards.
- Categories: redesigned category cards with a "Required" badge on the essential category.
- Policy link: policy bar restyled with a tint-based background; footer layout tightened.
- The unused `.cc-btn-link` class has been removed from the shipped stylesheet. If you were overriding it in your own CSS, copy the rules into your stylesheet.

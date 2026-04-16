---
'@zdenekkurecka/astro-consent': minor
---

Button hierarchy on banner and modal: Accept all and Reject all are now both primary; Manage preferences and Save preferences are secondary. On mobile (≤480px) the two primary actions share the top row and the third button spans full-width below.

Breaking (CSS only): the unused `.cc-btn-link` class has been removed. If you were overriding it, copy the rules into your own stylesheet.

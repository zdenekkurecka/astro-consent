# Architecture Decision Records

This folder captures the "why" behind architectural choices in astro-consent.
Each record is a short markdown file describing one decision, its context, and
its consequences — the
[Nygard-style](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
lightweight ADR format.

ADRs are a companion to the README and source comments, not a replacement.
They exist because the README explains *what the library does today* while an
ADR explains *why it ended up that way* — information that's hard to recover
once the code has moved on.

## How we use ADRs here

- **One decision per file.** If you're writing "and also…" you probably have
  two ADRs.
- **Filename:** `NNNN-kebab-title.md` with `NNNN` a zero-padded sequence
  number. Once assigned, never renumber — superseding ADRs gets its own new
  number and links back.
- **Status values:**
  - `Proposed` — drafted, under discussion.
  - `Accepted` — the code reflects this decision.
  - `Superseded by NNNN` — kept for history; a newer ADR replaces it.
  - `Deprecated` — the decision no longer applies and no replacement exists.
- **When to write one.** Add an ADR when a PR introduces (or reverses) a
  choice that's load-bearing for the library's public contract, security
  posture, or integration shape — things like "how we gate scripts", "how we
  talk to the outside world", "what we persist". Don't ADR bug fixes,
  refactors, or style changes.
- **Who drafts.** Anyone — including an AI agent — can draft an ADR from the
  template. A human reviewer signs off before the status flips from
  `Proposed` to `Accepted`.

## Working with AI-drafted ADRs

Inspired by [Adolfi.dev — AI-generated ADRs][adolfi]. An agent is good at
scanning the codebase and articulating what's already there, but it can
rationalize *accidents* as if they were deliberate *decisions*. Every
AI-drafted ADR goes through a human pass that answers: "did we actually
choose this, or did it just happen?" If it just happened, either make the
real choice now or don't record it.

[adolfi]: https://adolfi.dev/blog/ai-generated-adr/

## Index

| #    | Title                                                                                          | Status   |
| ---- | ---------------------------------------------------------------------------------------------- | -------- |
| 0001 | [Record architecture decisions](./0001-record-architecture-decisions.md)                       | Proposed |
| 0002 | [Declarative script blocking via `type="text/plain"`](./0002-declarative-script-blocking.md)   | Proposed |
| 0003 | [Event-based consent API on `document`](./0003-event-based-consent-api.md)                     | Proposed |
| 0004 | [Strict-CSP safety via hashed assets](./0004-strict-csp-safety.md)                             | Proposed |
| 0005 | [Google Consent Mode v2 as a first-class opt-in](./0005-google-consent-mode-v2.md)             | Proposed |
| 0006 | [Dual init for View Transitions and classic navigation](./0006-view-transitions-dual-init.md)  | Proposed |
| 0007 | [Category-based consent state with implicit `essential`](./0007-category-based-consent-state.md) | Proposed |
| 0008 | [No teardown on revocation](./0008-no-teardown-on-revocation.md)                               | Proposed |
| 0009 | [Virtual module for build-to-runtime config](./0009-virtual-module-config.md)                  | Proposed |

## Candidates for future ADRs

Decisions that are real but not yet written up. Add one when the topic next
comes up for discussion:

- `localStorage` (vs cookies / sessionStorage) as the consent store, with
  `version` and `maxAgeDays`-driven re-prompt.
- pnpm workspace + Changesets as the release flow.
- Playwright in the playground (vs unit tests) as the test strategy.
- ESM-only output with an `exports` map and `astro ^5 || ^6` peer range.

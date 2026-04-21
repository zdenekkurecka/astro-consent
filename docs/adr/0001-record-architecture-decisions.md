# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-04-21

## Context

The "why" behind astro-consent's shape is currently scattered across source
comments, the README, CHANGELOG entries, and individual Changeset files. This
has worked while the library is small and had effectively one maintainer, but
it's already painful for contributors and adopters trying to answer questions
like: *why does the runtime ship as hashed external assets instead of inline
scripts?*, *why isn't there a callback-based API?*, *why doesn't revocation
unload trackers?*

A single source of truth for load-bearing decisions — one that survives
refactors and code moves — keeps institutional knowledge from leaking out
with turnover.

## Decision

We will keep lightweight
[Architecture Decision Records](https://adr.github.io/) in
[`docs/adr/`](./README.md), one per file, numbered sequentially. Format:
Context / Decision / Consequences / References — see
[`template.md`](./template.md).

Scope is restricted to decisions that touch the library's public contract,
security posture, or integration shape. Bug fixes, refactors, and stylistic
choices stay out.

AI agents may draft ADRs from the codebase, but a human reviewer signs off
before any record moves from `Proposed` to `Accepted`.

## Consequences

- **Positive:** New contributors (and future-us) can answer "why is this
  like this?" without archaeology. Changeset entries can reference ADRs
  instead of re-explaining rationale.
- **Positive:** Writing an ADR surfaces cases where the current code is an
  accident rather than a decision — useful prompts for cleanup.
- **Negative:** Light ongoing overhead per PR that changes something
  architectural. Mitigated by keeping the format short.

## References

- [Michael Nygard — Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Adolfi.dev — AI generated ADRs](https://adolfi.dev/blog/ai-generated-adr/)

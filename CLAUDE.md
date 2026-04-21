# Working in this repo

## Architecture Decision Records

The `docs/adr/` folder holds the "why" behind load-bearing choices — see
[`docs/adr/README.md`](./docs/adr/README.md) for format and conventions.

When making a change, consider whether an ADR is warranted:

- **Yes** if the change introduces or reverses a decision about the public
  contract (config shape, events, runtime surface), security posture (CSP,
  storage, cross-origin), or integration shape (Astro hooks, virtual
  modules, peer-dep range). Examples that would need one: switching the
  consent store, changing the event model, adding a second tag-vendor
  integration alongside Google Consent Mode.
- **No** for bug fixes, refactors that preserve behaviour, styling, UI
  copy, documentation, or dependency bumps that don't shift the contract.

### Workflow

1. Before implementing, draft an ADR from
   [`docs/adr/template.md`](./docs/adr/template.md) and open it as
   `Proposed`. The draft is the design doc — it's cheaper to change minds
   on a markdown file than on merged code.
2. Use the next free number in sequence (`NNNN-kebab-title.md`).
3. Keep it short — Context, Decision, Consequences, References is enough.
   Cite file paths with line numbers, not prose descriptions of "where".
4. Flip status to `Accepted` when the implementing PR merges. If a later
   decision replaces it, set status to `Superseded by NNNN` and link both
   ways.
5. Add the new entry to the index table in
   [`docs/adr/README.md`](./docs/adr/README.md).

### AI-drafted ADRs

If you draft an ADR by scanning the codebase, flag it clearly and pass it
through a human review that answers the question: *did we actually choose
this, or did it just happen?* Don't lock accidents in as architecture.

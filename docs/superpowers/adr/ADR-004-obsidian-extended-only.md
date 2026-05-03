# ADR-004: Obsidian internal API access only via `obsidian-extended.ts`

- Date: 2026-04-30
- Status: Accepted

## Context
Obsidian exposes undocumented internal APIs via `(app as any).setting`, `(app as any).commands`, etc. Direct `(app as any)` casts scatter undocumented assumptions across the codebase and break silently when the internal API changes.

## Decision
All interaction with Obsidian internal/undocumented APIs MUST go through `src/types/obsidian-extended.ts`. `(app as any)` is prohibited and blocked by lint (`no-restricted-syntax` rule). New internal API surfaces must be added to `ExtendedApp` first, with a comment referencing the AGENTS.md integration API surface table.

## Consequences
- One file to update when an internal API changes.
- Lint catches any new direct casts at PR time.
- `obsidian-extended.ts` is the single source of truth for what internal APIs we depend on.

## Verification
`Grep` for `app as any` in `src/` — should return 0 (only JSDoc comments allowed).

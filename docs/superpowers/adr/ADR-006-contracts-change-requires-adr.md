# ADR-006: Changes to `contracts.ts` require a new ADR

- Date: 2026-04-30
- Status: Accepted

## Context
`src/types/contracts.ts` defines the public contract between all modules. Changes to interfaces affect every consumer. Without governance, ad-hoc changes cause cascading breakage.

## Decision
Any addition, removal, or modification of an interface in `src/types/contracts.ts` requires a new ADR justifying the change before the PR is merged. The ADR must be in the same commit as the interface change. Additive changes (new optional fields) still require an ADR but are lower risk.

## Consequences
- `contracts.ts` changes are never silent.
- Each ADR documents the reasoning, affected consumers, and migration path.
- The ADR folder becomes a changelog for the contract layer.

## Verification
PR review checklist: if `contracts.ts` changed, an ADR must be present in the same commit.

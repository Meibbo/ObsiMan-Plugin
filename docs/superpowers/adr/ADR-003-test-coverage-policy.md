# ADR-003: Test coverage policy — unit vs E2E scope

- Date: 2026-04-30
- Status: Accepted

## Context
Vitest (unit) and wdio-obsidian-service (E2E) serve different roles. Without a clear boundary, unit tests try to mount Svelte components and fail on DOM unavailability.

## Decision
Unit tests cover `src/utils/`, `src/logic/`, `src/services/` (excluding WIP files). Svelte components (`src/components/`) are covered by E2E (`wdio`), not by `@testing-library/svelte`. This is not a framework limitation — it is deliberate v1.0 scope.

## Consequences
- No unit test file should `import ... from '*.svelte'`.
- Coverage reports show 0% for `src/components/` — this is intentional.
- E2E tests in `test/e2e/` cover the rendered UI.

## Verification
`Grep` for `import.*\.svelte` in `test/unit/` — should return 0.

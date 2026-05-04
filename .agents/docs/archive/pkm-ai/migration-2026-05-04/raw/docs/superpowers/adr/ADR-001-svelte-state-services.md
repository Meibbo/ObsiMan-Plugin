# ADR-001: Reactive state lives in `*.svelte.ts` services

- Date: 2026-04-30
- Status: Accepted

## Context
Sub-A introduces rune-backed reactive state (`$state`/`$derived`) for indices, filter service, queue, router, and overlay state. We need a single rule for where that state lives.

## Decision
Services that hold reactive state MUST be named `*.svelte.ts`. They expose runes directly. Components consume runes either by direct import of the service instance or via a Svelte context provided in `frameVaultman.svelte`. Manual observers/emitters are forbidden in new code (legacy `Events` instances allowed inside `*.ts` services until they migrate).

## Consequences
- File naming is load-bearing: only `.svelte.ts` files run rune transforms.
- No mixed `Events`+rune state in the same file.
- Tests for `*.svelte.ts` services use the rune harness via Vitest's `flushSync` where needed.

## Verification
A future agent verifies by:
1. `Glob` `src/services/*.svelte.ts` and confirming each holds at least one `$state`.
2. `Grep` for `new Events(` in `src/services/*.svelte.ts` — should return 0.

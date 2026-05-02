# ADR-009: `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts` are UI components, not pure logic

- Date: 2026-04-29
- Status: Superseded by Sub-A.4.2 (2026-05-02) — files deleted; queue/filter behavior owned by `explorerQueue.svelte` + `explorerActiveFilters.svelte` consuming `IOperationsIndex` / `IActiveFiltersIndex` (ADR-010)

## Context

Spec §4.4 of the Hardening master plan lists `logicQueue.ts` and `logicFilters.ts` as test targets in Iter C.3. After Sub-B audit closure, those files contain `QueueIslandComponent` and `ActiveFiltersIslandComponent` — UI components that mount Svelte/HTMLElement DOM, not pure data logic.

## Decision

For Iter C.3 (Sub-C):
1. Skip unit-testing the contents of `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts`.
2. Cover the underlying queue and filter behavior via `src/services/serviceQueue.ts` and `src/services/serviceFilter.ts` in Iter C.4.
3. Exclude both files from the unit-coverage `include` patterns in `vitest.config.ts`.

For Sub-A:
4. Iter A.4.2 will rename the components to `src/components/explorerQueue.svelte` and `src/components/explorerActiveFilters.svelte` (per Annex A.4.2). The `src/logic/` files will then be deleted.
5. ADR-003 (Svelte components excluded from unit coverage) continues to apply.

## Consequences

- Unit-coverage thresholds for `src/logic/` are computed only over `logicProps.ts`, `logicTags.ts`, `logicsFiles.ts`. The 80% target applies to that subset.
- No code is left untested without a path forward: the queue + filter behavior is exercised at the service layer in C.4 and at the integration layer in `test/integration/fileCentricQueue.test.ts`.

## Verification

A future agent verifies this ADR is still valid by:
1. `Glob` for `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts`. If both are gone (post-A.4.2), this ADR can be marked Superseded.
2. Otherwise, confirm that `vitest.config.ts` `coverage.exclude` still lists those two paths.

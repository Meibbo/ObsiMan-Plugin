# ADR-007: Coverage thresholds are global; per-file exceptions documented here

- Date: 2026-04-30
- Status: Accepted

## Context
Vitest coverage thresholds can be set globally or per-file. Per-file exceptions lower the threshold for one file but risk masking regressions elsewhere.

## Decision
Coverage thresholds apply to the total repo aggregate (not per-file). Current thresholds: `src/utils/` ≥80% lines/branches, `src/logic/` ≥80%, `src/services/` ≥70%. `src/components/` intentionally 0% (ADR-003). Total report ≥60% lines / ≥65% branches. Exceptions are documented in this ADR rather than lowering the global threshold.

## Consequences
- One place to see all coverage exceptions.
- Global threshold reflects real coverage without artificial per-file carve-outs.
- New exceptions require updating this ADR.

## Verification
`vitest.config.ts` thresholds match the values above.

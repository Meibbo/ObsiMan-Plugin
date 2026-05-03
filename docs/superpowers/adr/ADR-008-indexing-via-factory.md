# ADR-008: All indexing uses `createNodeIndex<T>` factory

- Date: 2026-04-30
- Status: Accepted

## Context
Sub-A introduces 8 index services (Files, Tags, Props, Content, Operations, ActiveFilters, CSSSnippets, Templates). Without a shared factory, each service reimplements node storage, O(1) lookup, and subscriber notification differently.

## Decision
All index services implement `INodeIndex<T>` via the `createNodeIndex<T>()` factory from `src/services/createNodeIndex.ts`. The factory provides: rune-backed `nodes` array, `byId()` O(1) map, and `subscribe()`/`notify()` plumbing. Services only provide the `refresh()` implementation specific to their data source.

## Consequences
- Consistent behavior across all 8 indices.
- Tests for the factory cover shared plumbing once; each index test covers only `refresh()`.
- Adding a new index type = implement `refresh()` + pass to factory.

## Verification
`Grep` for `implements INodeIndex` in `src/services/` — every result should also call `createNodeIndex`.

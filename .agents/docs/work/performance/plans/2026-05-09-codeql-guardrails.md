---
title: CodeQL performance guardrails
type: implementation-record
status: done
parent: "[[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|ecosystem-performance-codeql-research]]"
created: 2026-05-09T18:26:27
updated: 2026-05-09T18:26:27
tags:
  - agent/performance
  - vaultman/codeql
  - vaultman/guardrails
created_by: codex
updated_by: codex
---

# CodeQL Performance Guardrails

## Scope

Continue the performance lane after durable TanStack virtualizer keys by
starting the custom CodeQL query pack. The first implemented guardrail is
`vaultman/virtualizer-missing-item-key`, matching the next action recorded in
[[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|ecosystem performance and CodeQL guardrail research]].

## Implementation

- Added `codeql/queries/javascript/vaultman/VirtualizerMissingItemKey.ql`.
- The query flags object-literal options passed to:
  - `createVirtualizer({...})`
  - `.setOptions({...})`
- The object must look like TanStack virtualizer options by carrying `count`,
  `getScrollElement`, and one virtualizer anchor option such as `estimateSize`,
  `overscan`, or `getItemKey`.
- The query reports the options object only when `getItemKey` is absent.
- The query intentionally uses local AST matching instead of dataflow so it
  stays precise for Vaultman's current Svelte virtualizer call shapes.
- Added a CodeQL test fixture under
  `codeql/tests/javascript/vaultman/virtualizer-missing-item-key/`.
- Wired `.github/codeql/codeql-config.yml` so the existing CodeQL analysis keeps
  `security-extended` and `security-and-quality` while also running the local
  Vaultman query pack.
- Added a `query-tests` job to `.github/workflows/codeql.yml` using
  `github/codeql-action/setup-codeql@v4` and:

```powershell
codeql test run --additional-packs codeql/queries/javascript codeql/tests --threads=0
```

## TDD Record

1. Initial RED with the existing scaffold failed at pack resolution because the
   local query pack was not passed as an additional pack.
2. RED rerun with `--additional-packs codeql\queries\javascript` failed on the
   missing `VirtualizerMissingItemKey.ql` reference.
3. After adding the query, the test failed against the empty expected file with
   exactly two alerts:
   - `createVirtualizer({...})` without `getItemKey`
   - `.setOptions({...})` without `getItemKey`
4. The two good fixture cases with `getItemKey` were not reported.
5. The expected file was updated and the query test passed.

## Verification

- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" query compile --additional-packs codeql\queries\javascript codeql\queries\javascript\vaultman\VirtualizerMissingItemKey.ql`
  passed.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\virtualizer-missing-item-key --threads=0`
  passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests --threads=0`
  passed with 1 test.

CodeQL on Windows repeatedly reported it could not clean up the generated
`virtualizer-missing-item-key.testproj` directory after successful test runs.
The directory was removed manually after verifying its resolved path stayed
inside the query test fixture directory.

## Remaining Performance Lane

Recommended next slice:

- Add the next static guardrail from the research list, likely
  `trailing-debounce-explorer-refresh` or
  `unbounded-vault-read-promise-all`.
- Alternatively switch from static guardrails back to runtime performance by
  implementing revision-gated explorer model caches.

---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
archive_source: "docs/archive/hardening/active-docs/2026-05-06T050935-current-handoff.md"
compacted: true
created: 2026-05-04T01:36:20
updated: 2026-05-06T05:12:35
tags:
  - agent/current
---

# Current Handoff

Archived completed/superseded handoff:
[[docs/archive/hardening/active-docs/2026-05-06T050935-current-handoff|2026-05-06 current handoff archive]].

## Where To Resume

- Continue [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|User-facing recovery wave A]].
- Next slice: A3 navbar badges and quick actions.
- Do not base `viewTable.svelte` on current `viewGrid.svelte`; it is failed
  table debt.
- Do not commit without explicit user request.
- Do not move AI files into `main`.

## Fresh Changes To Preserve

- A1 follow-up: FnR prop rename now emits `NATIVE_RENAME_PROP`, so
  `OperationQueueService` expands it into queued property rename operations.
- A2: `serviceFnR` starts/builds tag and file handoffs; tags queue frontmatter
  tag rename, files queue `RENAME_FILE`, and selected file nodes stay scoped.
- FnR rename island no longer renders an inline context label; context remains
  available through hover/title on the island and input so the input has space.
- `current/status.md` and `current/handoff.md` rule changed from 100 to 200
  lines; completed/superseded material should be archived first.

## Verified Commands

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceFnR.test.ts test/unit/services/serviceQueue.test.ts`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageFiltersRenameHandoff.test.ts`
- `pnpm run check`
- `pnpm run lint`
- `pnpm run build`
- `git diff --check`

## Known Residuals

- `pnpm run lint` exits 0 with two pre-existing unused-import warnings:
  `test/unit/services/serviceQueueRace.test.ts` imports unused `vi`, and
  `tools/pkm-ai/analyze-code.mjs` imports unused `path`.
- Full doc health still fails on pre-existing active `docs/superpowers` and
  oversized `docs/superpowers/plans/*` files.
- Combined component runs can still hit the known transient Svelte resolver
  issue; run Vite/Svelte verification sequentially.

---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
archive_source: "docs/archive/hardening/active-docs/2026-05-06T050935-current-status.md"
compacted: true
created: 2026-05-04T01:36:20
updated: 2026-05-06T06:24:11
tags:
  - agent/current
---

# Current Status

Initiative: hardening, user-facing recovery wave A.

Archived completed/superseded status:
[[docs/archive/hardening/active-docs/2026-05-06T050935-current-status|2026-05-06 current status archive]].

## Active Rules

- Active agent Markdown files, including `current/status.md` and
  `current/handoff.md`, stay under 200 lines.
- If current files fill with completed or superseded work, archive that material
  and link the archive instead of micro-compressing lines.
- Preserve source detail first; line limits are sharding or archive triggers,
  not permission to delete context.
- Timestamps use `YYYY-MM-DDTHH:mm:ss` with no timezone offset.
- Parent metadata uses one Obsidian wikilink in `parent`; do not use
  `parent_path`.
- `main` must contain zero AI files.

## Active Work

- Current wave source:
  [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|User-facing recovery wave A]].
- Completed in wave A:
  A0 CMenu queue repair, A1 prop/value rename handoff, A2 tag/file rename
  handoff with prop queue ingestion follow-up, and A3 navbar badges and quick
  actions.
- Bases parser compatibility has resumed after wave A: `file.name.contains`,
  `file.folder.contains`, and `file.path.contains` now import as supported
  Vaultman file rules.
- Next slice: continue deeper Obsidian/Bases/Dataview parser compatibility.

## Current Verification

- Focused unit tests pass for `serviceFnR`, `serviceQueue`,
  `explorerTags`, and `explorerFiles`.
- Focused component test passes for `pageFiltersRenameHandoff`.
- A3 focused component tests pass for `navbarPillFabBadges` and
  `viewTreeDecorations`.
- A3 focused unit tests pass for `explorerTags`, `explorerProps`, and
  `utilBadgeBubbling`.
- Bases parser focused unit tests pass for `serviceBasesInterop`,
  `filter-evaluator`, `indexBasesImportTargets`, and `serviceFilter`.
- `pnpm run check`, `pnpm run lint`, and `pnpm run build` pass.
- `pnpm run lint` currently reports six warnings outside the parser slice: the
  two known unused imports plus four BOM/irregular-whitespace warnings in
  files already present in the worktree.
- `pnpm run build` hit the known transient `svelte` resolver issue once, then
  passed on immediate sequential rerun.
- Combined component and Vite/Svelte runs can still hit the known transient
  resolver issue; avoid running Vite/Svelte verification commands in parallel.

## Source Links

- [[docs/current/handoff|current handoff]]
- [[docs/work/hardening/specs/2026-05-05-bases-interop-slice-1/index|Bases interop slice 1]]
- [[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|CMenu queue repair plan]]
- [[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/index|prop/value rename handoff plan]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/index|Bases interop research]]

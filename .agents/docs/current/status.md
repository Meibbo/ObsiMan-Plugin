---
title: Current status
type: agent-status
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T23:47:29
tags:
  - agent/current
---

# Current Status

Initiative: PKM-AI orchestration refresh.

State:

- Source of truth: `.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/`.
- Richer V2 draft: `.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/`.
- V2 plan draft: `.agents/docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/`.
- Bootstrap, migration, backlog, tools, and initial `vm-*` skills are implemented.
- `.agents/tools/pkm-ai/update-frontmatter.mjs` is implemented and tested.
- PKM-AI now names working memory, archive-before-delete, startup-without-prompt, and tool observation rules.
- Line limits now explicitly mean shard/manifest routing, not lossy compression or deletion of source detail.
- V2 exists because V1 overcompressed details from the design chat and should not be treated as the final knowledge-preserving version.
- `main` remains the release path with zero AI files.
- Current item: [[.agents/docs/work/pkm-ai/items/vm-0001-pkm-ai-orchestration-refresh|VM-0001]] in `verify`.

Current rules:

- Active agent Markdown files stay under 200 lines.
- `current/status.md` and `current/handoff.md` stay under 100 lines.
- Timestamps use `YYYY-MM-DDTHH:mm:ss` with no timezone offset.
- Parent metadata uses one Obsidian wikilink in `parent`; do not use `parent_path`.
- Working-memory removal requires archive or explicit user approval.
- Route summaries must preserve links to full source records, shards, or archives.

Recent work:

- Implemented PKM-AI archive/glossary/metrics tooling and policy gates.
- Doc health is clean after fixing four hardening regression frontmatters.
- Created serviceViews plan:
  [[.agents/docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews plan]].
- Implemented serviceViews Slice 0-2: `typeViews`, `ViewService`,
  `viewList`, queue migration, and active filters migration.
- User removed `src/superseded`; `pnpm run check` no longer reports
  superseded reference failures.
- Started serviceViews Slice 3: `ViewService` now maps `QueueChange` nodes to
  semantic operation badges/state and `ActiveFilterEntry` nodes to filter
  badges/state/highlights.
- Repaired stale test imports after index module moves and updated
  `popupIsland` test to the current `overlayIsland` path.
- `test:component` now runs with `--fileParallelism=false` because the full
  component suite reproduced a Vite/Svelte resolver race under parallel files.
- Run Vite+/Svelte verifications sequentially; parallel `build` plus component
  tests reproduced transient `svelte` import resolution failures, while each
  command passed alone.
- Unit tests now import test-only Obsidian mocks from
  `test/helpers/obsidian-mocks` instead of relying on the Vitest `obsidian`
  alias; integration tests keep real `obsidian` type imports.
- `vite.config.ts` now sets `resolve.conditions: ['browser']` so production
  builds resolve Svelte's client export.
- Operations suite live handoff saved:
  [[.agents/docs/work/hardening/backlog/regressions/operations-suite-live-handoff|operations suite live handoff]].
- `pressBarBench` live Obsidian probe now queues as 1 logical delete operation
  across 2 files, and props/tags explorer caches are invalidated per read.
- Continued hardening after the operations suite fix:
  `logicKeyboard` now drives explorer selection/focus; collapsed child badges
  bubble to parent indicators; queue badges remove their logical operation on
  click; file node activation creates a replaceable selected-files filter group.
- Latest hardening A slice added parent auto-expand for search/small trees,
  navbar read-more sources, 3-term per-tab search history, and file search
  active filter rules.
- Latest hardening B slice keeps `selected-files` as a visible active-filter
  group with child file rows, depth-aware list rendering, group/count badges,
  and synchronized remove behavior for the group or individual selected files.
- Latest hardening C slice added `serviceFnR`, an advanced navbar FnR island,
  content-tab queue replace across filtered/selected/all files, syntax/source
  metadata, and moved the help/read-more icon inside that advanced island.
- Remaining hardening: deeper Obsidian/Bases/Dataview parser compatibility and
  rename-node handoff into FnR mode.

Recent metric evidence:

- `health_passed` for `.agents/docs`, detail `0 warnings`, recorded in
  `.agents/metrics/pkm-ai.jsonl`.
- Tool friction starts as a hypothesis and graduates to a norm after repeat
  evidence or user approval.
- Documentation rule clarified: preserve detail first; line limits are sharding
  triggers, and temporary oversized captures are allowed when needed.
- Shards may be continuation-based as well as thematic; a long single topic can
  use `part-2` instead of being artificially split by subject.

Verification focus:

- Latest run: `pnpm run lint`, `pnpm run check`, `pnpm run build`, full unit Vitest with `--fileParallelism=false`, `pnpm run test:component`, and `obsidian plugin:reload id=vaultman` pass; `obsidian dev:errors` reports no captured runtime errors.
- Svelte autofixer on FnR-touched files reported no issues except existing `frameVaultman` structural suggestions.
- Next session should decide whether to promote V2 over V1 before staging.
- Timestamp updates now use `.agents/tools/pkm-ai/update-frontmatter.mjs`.

---
title: Current status
type: agent-status
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T18:15:57
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
- PKM-AI now names working memory, archive-before-delete, startup-without-prompt, and
  tool observation rules.
- Line limits now explicitly mean shard/manifest routing, not lossy compression
  or deletion of source detail.
- V2 exists because V1 overcompressed details from the design chat and should
  not be treated as the final knowledge-preserving version.
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
- User clarified that groups make every view mode hierarchical; badge bubbling
  is now a general hierarchy behavior, not tree-only. Parents should show a
  compact child badge indicator that expands on hover, while parent-owned badges
  remain separate.

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

- Latest run: `pnpm run check`, `pnpm run build`, `pnpm run test:unit`, and
  `pnpm run test:component` pass.
- Svelte autofixer on `src/services/serviceViews.svelte.ts` reported no issues;
  it suggested SvelteMap/SvelteSet for existing private maps/sets, left as
  explicit subscription state for this slice.
- `pnpm run lint` exits 0 with 0 warnings.
- Next session should decide whether to promote V2 over V1 before staging.
- Timestamp updates now use `.agents/tools/pkm-ai/update-frontmatter.mjs`.

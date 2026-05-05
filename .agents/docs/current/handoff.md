---
title: Current handoff
type: agent-handoff
status: active
parent: "[[.agents/docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T23:47:29
tags:
  - agent/current
---

# Current Handoff

Latest session continued implementation after user removed `src/superseded`.

Last known work:

- PKM-AI policy/tool repair implemented:
  `archive-active-doc.mjs`, `record-metric.mjs`, glossary lookup in
  `query-docs.mjs`, and health extensions.
- Four hardening regression frontmatters were fixed; doc health reports OK.
- Metric evidence exists in `.agents/metrics/pkm-ai.jsonl`; latest health event
  is `health_passed` with `0 warnings`.
- serviceViews implementation plan exists:
  [[.agents/docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews plan]].
- serviceViews Slice 0-2 implemented: `typeViews.ts`,
  `serviceViews.svelte.ts`, `viewList.svelte`, queue explorer migration, and
  active filters explorer migration.
- serviceViews Slice 3 has started: `ViewService` derives semantic layers for
  queue operation nodes and active filter nodes without requiring
  `DecorationManager` to fabricate those badges.
- Added unit coverage for queue operation badges/pending state and active
  filter badges/active state/filter highlight ranges.
- Repaired stale tests imports from old `src/services/service*Index`,
  `src/types/contracts`, and `src/utils/utilProp*` paths to current modules.
- Updated `popupIsland` component test to import current
  `layout/overlays/overlayIsland.svelte`.
- `test:component` script now passes `--fileParallelism=false` after reproducing
  Vite/Svelte resolver failures only in full parallel component runs.
- Avoid running Vite+/Svelte verification commands in parallel; `build` plus
  component tests reproduced transient `svelte` import resolution failures, but
  each command passed when run by itself.
- Unit tests now import mocks explicitly from `test/helpers/obsidian-mocks`
  instead of relying on `obsidian` alias exports; integration tests still import
  real Obsidian types from `obsidian`.
- Production build now resolves Svelte with `resolve.conditions: ['browser']`
  in `vite.config.ts`.
- User validated a service-owned explorer view architecture.
- New spec exists:
  [[.agents/docs/work/hardening/specs/2026-05-04-explorer-view-service/index|Explorer view service]].
- Spec preserves detail in shards: current state, taxonomy, principles,
  `serviceViews`, layers, projections, decorations/marks, interactions, groups,
  migration, tests, and risks.
- Confirmed taxonomy: `tree`, `table`, `grid`, `cards`, `list`.
- `table` means Bases/Excel-like matrix; `grid` means file-explorer medium icon
  layout; `cards` means Bases-like cards; `list` is compact queue/filter/marks.
- Confirmed rule: `serviceViews` produces semantic layers; each view presents
  layers in its own way.
- Confirmed rule: because groups are being added to all views, all view modes
  should treat their render model as hierarchical; badge bubbling is general,
  not tree-specific.
- Current operations suite handoff:
  [[.agents/docs/work/hardening/backlog/regressions/operations-suite-live-handoff|operations suite live handoff]].
- `pressBarBench` live probe queues as one logical delete op over two files;
  props/tags explorers now invalidate cached trees on read to avoid stale
  metadata after core Obsidian or Vaultman changes.
- Follow-up hardening implemented badge bubbling for collapsed tree descendants,
  click-to-remove queue badges, file-node activation into selected-files
  filters, and the shared `logicKeyboard` explorer selection path.
- Queue and active filters now render through shared `ViewList` models while
  keeping popup shell actions in their explorer components.
- Latest hardening A slice added parent auto-expand for search/small trees,
  navbar help/read-more links, 3-term per-tab search history, and file search
  terms as active filter rules.
- Latest hardening B slice added `selected-files` hierarchy to active filters:
  `indexActiveFilters` emits a parent group row plus file children, `ViewList`
  renders row depth, and `explorerActiveFilters` removes the group or child
  files through `setSelectedFileFilter` so `selectedFiles` stays synchronized.
- Latest hardening C slice added `serviceFnR`, an advanced navbar FnR island
  with the help/read-more links inside it, and content-tab queue replace across
  filtered/selected/all file scopes.
- `viewGrid.svelte` is considered failed table debt and should not seed
  `viewTable.svelte`.
- Docs policy updated: preserve detail first; line limits are sharding triggers,
  not content caps; temporary oversized captures are allowed if needed.

Next agent should:

1. Read `AGENTS.md`, [[.agents/docs/start|start]], [[.agents/docs/current/status|status]], and this file.
2. Read the Explorer view service spec index and relevant shards.
3. Current verification passes: `pnpm run lint`, `pnpm run check`, `pnpm run build`, full unit Vitest with `--fileParallelism=false`, `pnpm run test:component`, `obsidian plugin:reload id=vaultman`, and `obsidian dev:errors`.
4. Continue with deeper parser compatibility and rename-node handoff into FnR mode.
5. Review `git status`; there are unrelated/user changes in product files.

Do not: commit without explicit user request; move AI files into `main`; use `parent_path`; compress specs/plans; base `viewTable` on current `viewGrid.svelte`.

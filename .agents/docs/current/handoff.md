---
title: Current handoff
type: agent-handoff
status: active
parent: "[[.agents/docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-04T01:36:20
updated: 2026-05-06T04:12:52
tags:
  - agent/current
---

# Current Handoff

Latest session continued implementation after user removed `src/superseded`.

Last known work:

- PKM-AI policy/tool repair implemented:
  `archive-active-doc.mjs`, `record-metric.mjs`, glossary lookup in
  `query-docs.mjs`, and health extensions.
- Four hardening regression frontmatters were fixed earlier; current doc health
  now fails on unrelated `docs/superpowers` and oversized superpowers plans.
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
- Explorer view spec preserves taxonomy and `serviceViews` layer/group rules in shards.
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
- Bases interop research continued with API details and a compatibility matrix: [[.agents/docs/work/hardening/research/2026-05-05-bases-interop-research/index|bases interop research]].
- Latest hardening D slice added `IndicatorOrbitingInk.svelte`, an organic
  gooey loading indicator based on "Indicator 18" from Organic Loading
  Indicators, and updated `viewEmptyLanding.svelte` to use it for all loading
  states (e.g., tabContent indexing).
- User selected [[.agents/docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|User-facing recovery wave A]] as the first deferred-work wave.
- A0 CMenu queue repair completed: [[.agents/docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|CMenu queue repair implementation]].
  Tags/files CMenu actions now stage queue work; `file_delete` trashes only on queue execute.
- A1 Prop/Value Rename Handoff completed: `serviceFnR` owns typed rename
  handoff state/builders, `explorerProps` routes prop/value CMenu rename into
  the shared handoff, and `NavbarExplorer` confirms/cancels queued rename work.
- New component coverage: `test/component/pageFiltersRenameHandoff.test.ts`
  proves prop rename opens the navbar handoff instead of `showInputModal` and
  queues the native property rename change.
- Current A1 verification passes: focused `serviceFnR`/`explorerProps` unit
  tests, focused `pageFiltersRenameHandoff` component test, `pnpm run check`,
  `pnpm run lint`, and `pnpm run build`.
- Lint has two pre-existing unused-import warnings outside A1; combined
  component runs can still hit transient `svelte` resolver failure.
- Next slice is A2 Tag/File Rename Handoff into the same FnR/navbar model.
- Review `git status`; there are unrelated/user changes in product files.

Do not: commit without explicit user request; move AI files into `main`; use `parent_path`; compress specs/plans; base `viewTable` on current `viewGrid.svelte`.

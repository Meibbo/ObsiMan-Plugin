---
title: Slice 2 viewList migration
type: plan-shard
status: active
parent: "[[.agents/docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceviews-plan]]"
created: 2026-05-04T16:40:00
updated: 2026-05-04T16:40:00
tags:
  - agent/plan
  - explorer/views
---

# Slice 2 viewList Migration

## Files

- Create: `src/components/views/viewList.svelte`
- Create or modify: `test/component/viewList.test.ts`
- Modify: `src/components/explorers/explorerQueue.svelte`
- Modify: `src/components/explorers/explorerActiveFilters.svelte`

## Steps

- [ ] Use Svelte tooling before finalizing the new component.
- [ ] Add a failing component test that mounts `viewList.svelte` with two rows,
  verifies labels/details render, and verifies row action callback receives the
  semantic action and row id.
- [ ] Implement `viewList.svelte` as a renderer for `ExplorerRenderModel`
  `rows`, with virtualization owned by the view.
- [ ] Migrate `explorerQueue.svelte` to build a list model and pass it to
  `viewList`. Keep clear/execute/close toolbar behavior unchanged.
- [ ] Migrate `explorerActiveFilters.svelte` to build a list model and pass it
  to `viewList`. Keep clear/close toolbar behavior unchanged.
- [ ] Run component test, unit test, and `pnpm run check`.

## Acceptance

- Queue popup still shows operation type/detail and remove buttons.
- Active filters popup still shows rule descriptions and remove buttons.
- Explorers no longer instantiate their own `Virtualizer` for list rows.
- `viewList.svelte` does not know about queue/filter services.

---
title: Backlog system
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[.agents/docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/plan
---

# Backlog System

## Task 1: Create Templates

**Files:**
- Create: `.agents/docs/templates/item-template.md`
- Create: `.agents/docs/templates/spec-index-template.md`
- Create: `.agents/docs/templates/plan-index-template.md`
- Create: `.agents/docs/templates/conflict-report-template.md`

- [ ] Templates use `created` and `updated` with `YYYY-MM-DDTHH:mm:ss`.
- [ ] Item template uses `VM-0001` shape and canonical fields.

## Task 2: Create Backlog Indexes

**Files:**
- Create: `.agents/docs/current/backlog.md`
- Create: `.agents/docs/current/bugs.md`
- Create: `.agents/docs/current/regressions.md`
- Create: `.agents/docs/current/conflicts.md`

- [ ] Each index is compact and links to item files.
- [ ] Each index states shard triggers.

## Task 3: Create Backlog Base

**Files:**
- Create: `.agents/docs/current/backlog.base`

- [ ] Views: `Active`, `Bugs`, `Regressions`, `Conflicts`, `Done`.
- [ ] Filter notes by folder `.agents/docs/work/` and tag `agent/item`.

## Task 4: Create First PKM-AI Item

**Files:**
- Create: `.agents/docs/work/pkm-ai/items/vm-0001-pkm-ai-orchestration-refresh.md`

- [ ] Link spec and plan.
- [ ] Set `status: planned`.
- [ ] Set `task_size: large`.


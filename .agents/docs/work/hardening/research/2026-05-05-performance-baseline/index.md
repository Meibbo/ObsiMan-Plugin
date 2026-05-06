---
title: Performance baseline
type: research
status: active
parent: "[[.agents/docs/work/hardening/specs/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/research
  - performance
---

# Performance Baseline

## Environment

- Date: 2026-05-05
- Branch: hardening-refactor
- Command path: Obsidian CLI `obsidian eval`
- Plugin reload: passed

## Scenario Results

### filters-search

```json
{"startedAt":4907659.700000003,"endedAt":4908177.200000003,"counters":{"scenario.filters-search":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":416,"totalRows":0,"totalVisibleRows":0,"totalMs":309.8999999910593,"maxMs":204.59999999403954},"viewTree.flatten":{"count":4,"totalNodes":416,"totalRows":0,"totalVisibleRows":0,"totalMs":2.3999999910593033,"maxMs":2.0999999940395355},"decoration.decorate":{"count":1098,"totalNodes":1098,"totalRows":0,"totalVisibleRows":0,"totalMs":1.399999976158142,"maxMs":0.10000000894069672},"viewService.getModel":{"count":12,"totalNodes":12,"totalRows":0,"totalVisibleRows":0,"totalMs":1,"maxMs":0.7999999970197678},"panelExplorer.getTree":{"count":2,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":79.8999999910593,"maxMs":61.099999994039536}},"scenario":"filters-search"}
```

### tree-scroll

```json
{"startedAt":4921642,"endedAt":4921661.200000003,"counters":{"scenario.tree-scroll":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewTree.scroll":{"count":12,"totalNodes":0,"totalRows":144,"totalVisibleRows":144}},"timings":{},"scenario":"tree-scroll"}
```

### filter-select

```json
{"startedAt":4937611.599999994,"endedAt":4937801.700000003,"counters":{"scenario.filter-select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.clearSelection":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.setFocused":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"decoration.decorate":{"count":324,"totalNodes":324,"totalRows":0,"totalVisibleRows":0,"totalMs":0.7000000178813934,"maxMs":0.20000000298023224},"panelExplorer.getTree":{"count":4,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":86.8999999910593,"maxMs":61.70000000298023},"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":22,"totalRows":0,"totalVisibleRows":0,"totalMs":24.200000002980232,"maxMs":14.300000011920929},"viewTree.flatten":{"count":4,"totalNodes":22,"totalRows":0,"totalVisibleRows":0,"totalMs":0.19999998807907104,"maxMs":0.09999999403953552},"viewService.getModel":{"count":152,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":6.500000059604645,"maxMs":2}},"scenario":"filter-select"}
```

### operation-badges

```json
{"startedAt":4952371.700000003,"endedAt":4952771.200000003,"counters":{"scenario.operation-badges":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.clearSelection":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.setFocused":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"decoration.decorate":{"count":2324,"totalNodes":2324,"totalRows":0,"totalVisibleRows":0,"totalMs":5.700000032782555,"maxMs":2.5999999940395355},"panelExplorer.getTree":{"count":4,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":77.10000002384186,"maxMs":42.20000000298023},"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":113.30000001192093,"maxMs":57.20000000298023},"viewTree.flatten":{"count":4,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":0.09999999403953552,"maxMs":0.09999999403953552},"viewService.getModel":{"count":152,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":2.2000000178813934,"maxMs":0.20000000298023224}},"scenario":"operation-badges"}
```

## Findings

1. Highest call count: `decoration.decorate`, count `2324`, scenario `operation-badges`; it matters because decoration work scales per rendered semantic row and can amplify any refresh that rebuilds explorer nodes.
2. Highest total measured time: `panelExplorer.bubbleHiddenTreeBadges`, total `309.8999999910593` ms, scenario `filters-search`; it matters because this single derived pass dominated measured work during search.
3. Highest max measured time: `panelExplorer.bubbleHiddenTreeBadges`, max `204.59999999403954` ms, scenario `filters-search`; this matches the reported search/filter jank better than `viewTree.flatten`, which stayed near 2.1 ms max.
4. Missing metrics: `panelExplorer.getFiles` was absent from the active DOM scenarios; `panelExplorer.getTree.totalNodes` remains `0` because reading `nodes.length` inside the tree refresh effect caused a Svelte dependency loop and was removed; operation/filter badge recomputation is visible indirectly through decoration, view-service, and bubbling metrics but is not yet split into a dedicated counter.

## Next Optimization Candidates

1. `PanelExplorer` badge bubbling: optimize or cache `bubbleHiddenTreeBadges` because it had the highest total and max duration, especially during `filters-search`.
2. `DecorationManager` / semantic row projection: reduce or cache `decoration.decorate` calls because it reached `2324` calls in `operation-badges` and `1098` calls in `filters-search`, even though individual call time was low.

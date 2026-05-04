---
title: Authoring policies
type: spec-slice
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
  - agent/policy
---

# Authoring Policies

## Timestamp Format

Use Obsidian-compatible date-time values without timezone offsets:

```yaml
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
```

Date-only values are allowed only when the property is intentionally a date,
not a timestamp.

## Parent Links

Use one `parent` property. Put the full path inside an Obsidian wikilink and
use the initiative as alias:

```yaml
parent: "[[.agents/docs/work/pkm-ai/specs/topic/index|pkm-ai]]"
```

Do not add a second verbose parent path field.

## Policy Enforcement

Agents may forget detailed conventions. Therefore health scripts must verify
timestamp shape, parent link shape, line limits, frontmatter parse, and forbidden
paths before claiming the docs are ready.


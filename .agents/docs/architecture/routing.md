---
title: Routing
type: architecture
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T16:12:00
tags:
  - agent/architecture
---

# Routing

Required route:

1. `AGENTS.md`
2. `.agents/docs/start.md`
3. `.agents/docs/current/status.md`
4. `.agents/docs/current/handoff.md`
5. mode-specific docs

Mode routes:

- `scout` -> read-only target files.
- `research` -> research sources and knowledge note.
- `teach` -> PKM-AI manual or compact map.
- `implement` -> initiative index, active plan, relevant policies.
- `review` -> changed files and matching policy.
- `update` -> docs policy and target doc set.
- `health` -> verification rules and health scripts when present.
- `handoff` -> status and handoff only.
- tool/environment friction -> tools policy, then current handoff if still relevant.

Route repair:

- If an index becomes a giant index, shard it.
- If startup reads too much, move detail into policy or knowledge files.
- If current files contain history, archive the history.

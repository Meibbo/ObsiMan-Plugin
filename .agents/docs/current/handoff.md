---
title: Current handoff
type: agent-handoff
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T08:57:49
tags:
  - agent/current
---

# Current Handoff

Last known work:

- Lean `AGENTS.md` and `CLAUDE.md` now route through `.agents/docs/start.md`.
- Legacy active agent docs moved to `.agents/docs/archive/pkm-ai/migration-2026-05-04/raw/`.
- Backlog indexes, `backlog.base`, templates, and VM-0001 exist.
- PKM-AI tools exist under `.agents/tools/pkm-ai/`.
- Initial skills exist: `vm-start-session`, `vm-backlog-manager`, `vm-pkm-ai-guide`.
- `vm-regression-resolver` was renamed from the old long Vaultman name.
- `.gitignore` now exposes only `vm-*` skills; other local skills stay out of new tracking.
- Timestamp updates now use `.agents/tools/pkm-ai/update-frontmatter.mjs`.
- Working-memory and tool-observation norms were added to architecture policies.
- Line limits now mean shard/manifest routing, not lossy compression or deletion.
- A richer V2 spec and V2 plan now exist for the orchestration refresh because
  V1 compressed too aggressively:
  [[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|V2 spec]]
  and [[.agents/docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/index|V2 plan]].
- `rg.exe` access denial in Codex App on Windows is captured as a tools-policy hypothesis.
- Latest verification passed: doc health, frontmatter tests, V2 query, and line counts.

Next agent should:

1. Read `AGENTS.md`.
2. Read [[.agents/docs/start|start]].
3. Read [[.agents/docs/current/status|status]] and this file.
4. Read the V2 spec before continuing PKM-AI architecture work.
5. Review `git status` and decide the curated commit scope.
6. If approved, stage only intended AI workflow files.
7. If handoff needs more detail, write archive shards under `archive/<initiative>/handoffs/`.

Do not:

- Commit without explicit user request.
- Move AI files into `main`.
- Use `parent_path`.
- Expand active Markdown files past their line limits.

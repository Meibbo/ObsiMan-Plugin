---
title: Current status
type: agent-status
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T08:57:49
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
- Tool friction starts as a hypothesis and graduates to a norm after repeat
  evidence or user approval.

Verification focus:

- Latest run: doc health OK, frontmatter tests 5/5, V2 query returns spec and plan.
- `pnpm run build` passes.
- Next session should decide whether to promote V2 over V1 before staging.
- Timestamp updates now use `.agents/tools/pkm-ai/update-frontmatter.mjs`.

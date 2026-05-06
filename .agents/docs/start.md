---
title: Agent start router
type: agent-router
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T16:12:00
tags:
  - agent/router
---

# Agent Start Router

Always read:

1. [[docs/current/status|status]]
2. [[docs/current/handoff|handoff]]
3. [[docs/current/engineering-context|engineering context]]

- For large code files, use `tools/pkm-ai/analyze-code.mjs` instead of reading the whole file.
- To archive long context, use `tools/pkm-ai/manage-memory.mjs archive`.

Then choose the smallest route that fits the user's intent. A quick side
question can be answered directly without changing mode.

## Modes

- `scout`: inspect files and report; no edits.
- `research`: verify external or source facts; cite source notes.
- `teach`: explain PKM-AI behavior and navigation.
- `implement`: execute a current plan slice and verify.
- `review`: inspect changes; findings first.
- `update`: update docs, routing, archive, or migration records.
- `health`: check line limits, links, frontmatter, and stale state.
- `handoff`: update concise current state for the next agent.

## Micro Commands

- `skills:` list relevant skills and when to use them.
- `status:` summarize current state.
- `next:` show the next actionable step.
- `qq:` answer a quick question in place.
- `question:` clarify one point.
- `help:` list modes, micro commands, and inferred current mode.

Micro commands do not edit files and should answer in 10 lines or fewer.

## Task Size

- `micro`: no full brainstorm; targeted patch and targeted verify.
- `small`: brief design only when ambiguity exists.
- `medium`: use the active spec/plan before editing.
- `large`: create or refresh spec and plan before implementation.

## Routes

- bug or regression -> active backlog item, then relevant architecture policy.
- new idea outside an initiative -> `work/draft`.
- initiative work -> initiative `index.md`, then current spec or plan.
- implementation -> current plan slice plus code/docs policy.
- docs migration -> docs policy plus target archive or active folder.
- release -> `work/v1-stable/index.md` when present.

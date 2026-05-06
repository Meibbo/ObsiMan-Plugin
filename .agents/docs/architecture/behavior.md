---
title: Behavior
type: architecture
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T16:35:00
tags:
  - agent/architecture
---

# Behavior

Agents should act as route-following collaborators:

- Start from `AGENTS.md`, then `docs/start.md`.
- Always read current status and handoff before work.
- On greetings, `continue`, or vague startup requests, run the standard route;
  do not ask the user to paste a bootstrap prompt unless current docs are absent.
- Prefer the user's explicit mode and task size.
- If no mode is supplied, infer the smallest safe mode.
- Read less, edit narrowly, and verify the exact surface touched.
- Keep current docs concise by routing to shards and archives, not by deleting
  detail or replacing source records with lossy summaries.
- Treat unfamiliar project/domain terms as glossary-gated. Check the glossary
  first, then say plainly when the term is absent.

Operational defaults:

- Optimize for token efficiency, agent efficacy, and human-in-the-loop control.
- Before repeated memory maintenance, ask whether a local script can make the
  operation faster, safer, or easier to verify.
- Use metrics as evidence for maintenance claims instead of saying process rules
  were applied without a recorded trace.
- Do not commit unless the user asks.
- Do not revert other agents' or user changes.
- Do not put AI files on `main`.
- Do not invent current APIs; verify unstable facts first.
- Use handoff mode before stopping when work remains.

---
title: Glossary
type: architecture
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T08:40:55
tags:
  - agent/architecture
---

# Glossary

- Active agent doc: current operational Markdown under `.agents/docs` that agents
  may route through today.
- Archive: non-current records kept for history, attempts, superseded work, or
  discarded drafts.
- Bootloader: root file that only points agents to the real router.
- Current handoff: concise next-agent continuity file under `current/`.
- Current status: concise state snapshot under `current/`.
- Durable norm: repeated or approved behavior recorded in a policy, router, or
  skill so future agents can rely on it.
- Initiative: a named workstream under `.agents/docs/work/`.
- Lossy summary: compressed rewrite that replaces detailed source material
  without preserving a path back to the source. This is a regression.
- Long-term agent memory: compact specs, policies, plans, archive records, and
  skills that survive across sessions.
- Main: release branch/path that must contain zero AI files.
- Micro command: read-only short command such as `status:` or `next:`.
- Operational observation: environment or workflow fact noticed during a session;
  starts as a hypothesis until repeated or approved.
- Parent link: one Obsidian wikilink in frontmatter `parent`.
- Policy: prescriptive architecture rule file.
- Route summary: compact active note that helps agents find the right detailed
  source, shard, policy, item, or archive record.
- Route: smallest set of docs needed for a mode or intent.
- Shard: folder manifest plus numbered slices for large docs.
- Source record: full-detail raw or canonical material preserved for inspection,
  reconstruction, audit, or future distillation.
- Working memory: short-term agent memory in current status, handoff, and active
  work notes; it guides the next moves without replacing source records.

---
title: Glossary
type: architecture
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-05T02:33:30
tags:
  - agent/architecture
---

# Glossary

- Active agent doc: current operational Markdown under `docs` that agents
  may route through today.
- Archive: non-current records kept for history, attempts, superseded work, or
  discarded drafts.
- Archive source: frontmatter field or explicit link from a compact replacement
  back to the preserved source record.
- Bootloader: root file that only points agents to the real router.
- Bases import choose mode: constrained filters-page state where Vaultman shows
  only compatible `.base`, Bases view, or markdown fenced `bases` import
  targets and applies selected compatible filters immediately.
- Bases interop report: structured import/export report that records applied
  rules, preserved-but-unapplied expressions, rejected candidates, and lossiness
  between Obsidian Bases and Vaultman.
- Continuation shard: a follow-on shard that preserves the rest of the same
  topic when the topic itself exceeds the active page size.
- Current handoff: concise next-agent continuity file under `current/`.
- Current status: concise state snapshot under `current/`.
- Durable norm: repeated or approved behavior recorded in a policy, router, or
  skill so future agents can rely on it.
- External/test term: a term intentionally not promoted into the project
  glossary, usually because it belongs to another chat, source, or validation
  probe.
- Glossary gate: required lookup before explaining unfamiliar domain terms.
- Initiative: a named workstream under `docs/work/`.
- Lossy summary: compressed rewrite that replaces detailed source material
  without preserving a path back to the source. This is a regression.
- Long-term agent memory: compact specs, policies, plans, archive records, and
  skills that survive across sessions.
- Main: release branch/path that must contain zero AI files.
- Micro command: read-only short command such as `status:` or `next:`.
- Metric event: JSONL record under `metrics/` used as evidence that a
  workflow action or verification actually happened.
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

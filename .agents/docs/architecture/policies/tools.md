---
title: Tools policy
type: policy
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T16:35:00
tags:
  - agent/policy
---

# Tools Policy

## Rules

- Prefer fast structured tools and scripts before manual reading.
- If a repeated task costs context or time, consider a local script.
- Record environment/tool friction as an operational observation when it affects
  future agent behavior.
- Observations start as hypotheses. Graduate them to durable norms after repeat
  failures, repeat success, or explicit user approval.
- Keep hypotheses compact; if they need work, promote them to backlog items.
- Preserve human-in-the-loop control: do not automate staging, commits, merges,
  or destructive edits without explicit user approval.
- Use `.agents/tools/pkm-ai/archive-active-doc.mjs` before substantial rewrites
  of active current docs, specs, plans, or policies that remove source detail.
- Use `.agents/tools/pkm-ai/record-metric.mjs` or tool-integrated metrics for
  evidence-bearing workflow events: `glossary_checked`, `glossary_miss`,
  `archive_created`, `line_limit_sharded`, `health_failed`, and `health_passed`.
- Status and handoff claims should cite recent metric evidence when the claim is
  about applied process, health, archives, glossary checks, or sharding.
- Use `.agents/tools/pkm-ai/query-docs.mjs --glossary <term>` as the fast
  glossary gate before explaining unfamiliar project/domain terms.

## Current Hypotheses

- In Codex App on Windows, bundled `rg.exe` can fail with `Access is denied`.
  Prefer `rg` when available; if it fails, fall back to PowerShell
  `Get-ChildItem` and `Select-String`.

## Read When

- Choosing search, indexing, migration, verification, or maintenance tools.
- Recording environment friction or successful tool fallbacks.
- Deciding whether to automate repeated memory maintenance.

## Do Not Read When

- Answering a direct conceptual question with no tooling impact.

## Repair Triggers

- Agents repeatedly rediscover the same tool failure.
- Manual memory maintenance repeats when a script could verify it.
- Tool observations grow too large for this policy.
- Agents claim archive, health, glossary, or sharding behavior without metrics.

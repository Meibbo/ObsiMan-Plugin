---
name: vm-start-session
description: Use when starting a Vaultman agent session, choosing a route or mode, loading current status or handoff, inferring task size, or answering startup micro commands.
---

# Vaultman Start Session

Use this as the smallest read-only boot path for Vaultman work.

## Core Route

Read, in order:

1. `AGENTS.md`
2. `.agents/docs/start.md`
3. `.agents/docs/current/status.md`
4. `.agents/docs/current/handoff.md`

Then infer the smallest safe mode from the user's request unless the user named one.

## Output

Keep startup output compact:

- mode
- task size when supplied or obvious
- next docs or files to read
- any blocker that prevents routing

For micro commands such as `skills:`, `status:`, `next:`, `qq:`, `question:`, or `help:`, answer read-only and stay under 10 lines.

## Tools And Docs

Use project scripts when they reduce reading:

- `.agents/tools/pkm-ai/query-docs.mjs`
- `.agents/tools/pkm-ai/index-docs.mjs`
- `.agents/tools/pkm-ai/check-doc-health.mjs`

Relevant docs:

- `.agents/docs/architecture/routing.md`
- `.agents/docs/architecture/behavior.md`
- `.agents/docs/architecture/policies/docs.md`

Do not edit files from this skill. Switch to the routed mode or another skill before making changes.

# AGENTS.md - Vaultman Agent Bootloader

This branch permits AI workflow files. `main` must contain zero AI files:
no `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, or generated agent caches.

## Start Here

1. Read `.agents/docs/start.md`.
2. Always read `.agents/docs/current/status.md`.
3. Always read `.agents/docs/current/handoff.md`.
4. Route by the user's explicit mode or inferred intent.
5. Read only the smallest relevant docs before editing.

## Session Modes

Use the mode named by the user, or infer one:

- `scout`: read-only orientation.
- `research`: verify sources and write knowledge only when asked.
- `teach`: explain the PKM-AI system.
- `implement`: execute a scoped plan.
- `review`: findings first, ordered by risk.
- `refresh`: update or migrate docs.
- `health`: check doc/system consistency.
- `handoff`: compact current state for the next agent.

Micro commands are read-only and short: `skills:`, `status:`, `next:`,
`qq:`, `question:`, `help:`.

## Size And Context

Use `task_size` when supplied:

- `micro`: targeted patch and targeted verification.
- `small`: brief design only if ambiguous.
- `medium` or `large`: use spec/plan workflow before edits.

If your remaining context appears below 20%, warn the user and suggest
switching agents before starting implementation.

## Line Limits

- Every active agent Markdown file must stay under 200 lines.
- `.agents/docs/current/status.md` and `.agents/docs/current/handoff.md`
  must stay under 100 lines.
- Shard large specs, plans, histories, indexes, and manuals into folders with
  compact `index.md` manifests.

## Branch Policy

- Do not put AI files on `main`.
- AI docs live on branches such as `hardening` or `dev`.
- Do not revert or overwrite changes you did not make.
- Do not commit unless the user explicitly asks.
- Before merge/release work, confirm how AI files will be excluded from `main`.

## Project Rules

For product code, follow `.agents/docs/architecture/policies/code.md`.
For Git, docs, backlog, and context rules, use the matching file under
`.agents/docs/architecture/policies/`.

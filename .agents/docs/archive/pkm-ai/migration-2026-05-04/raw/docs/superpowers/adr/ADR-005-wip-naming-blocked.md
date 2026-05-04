# ADR-005: WIP files blocked from `hardening` and `main`

- Date: 2026-04-30
- Status: Accepted

## Context
Files named `*-WIP*` or `*_WIP*` indicate in-progress work not ready for integration. Without a gate, WIP files can be accidentally merged to stable branches.

## Decision
Files matching `*-WIP*` or `*_WIP*` are blocked from being merged to `hardening` or `main` by a CI path-check rule. To promote a WIP file, it must be renamed (removing the WIP suffix) in a deliberate commit with a comment explaining the promotion.

## Consequences
- CI blocks PRs that include WIP-named files targeting `hardening`/`main`.
- Agents must rename before creating a PR.
- The rename commit is the promotion record.

## Verification
CI rule checks `git diff --name-only origin/hardening...HEAD` for `*WIP*` patterns.

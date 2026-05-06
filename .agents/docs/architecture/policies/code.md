---
title: Code policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T01:36:20
tags:
  - agent/policy
---

# Code Policy

## Rules

- Follow existing Vaultman architecture before adding abstractions.
- Use Obsidian DOM helpers; do not use raw HTML insertion.
- Toggle CSS classes; do not overwrite `className` or assign static styles.
- Register Obsidian events for cleanup.
- Use O(1) vault lookups when a path is known.
- Verify plugin or API integrations from current sources before coding.

## Read When

- Editing product code.
- Touching Obsidian API, services, UI components, or integrations.

## Do Not Read When

- Editing only agent documentation.

## Related Decisions

- Vaultman code architecture and ADRs under project docs.

## Repair Triggers

- Raw DOM patterns appear.
- A service/type contract changes without ADR review.
- Integration code assumes an unverified API.

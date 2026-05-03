# ADR-011: All visual decoration flows through IDecorationManager

- Date: 2026-05-01
- Status: Accepted

## Context
Sub-A.4.1 introduces DecorationManager. Without a rule, views compute icons/badges/highlights inline, making it impossible to test decoration logic and creating duplication.

## Decision
All visual decoration (icons, badges, highlights, snippets) is computed by `IDecorationManager.decorate(node, context)`. Views consume the output — they never compute decoration themselves.

## Consequences
- Decoration logic is testable in isolation without mounting a component.
- Swapping decoration strategies (e.g., adding icon rules in v1.1) requires only changing the manager implementation.
- Views are dumb renderers: they call `decorate()` and render the result.

## Verification
Grep for inline badge/icon/highlight computation in `src/components/` — should return 0 after Sub-A.4.1 is complete.

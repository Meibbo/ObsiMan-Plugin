# ADR-010: `IOverlayState` replaces popup prop drilling

- Date: 2026-05-01
- Status: Accepted

## Context

Pre-A.4.2, `frameVaultman.svelte` drilled 13 props into `layoutPopup.svelte` (active-filters / scope / search / move payloads). Adding a popup required touching every level of the component tree.

## Decision

Popups register themselves via `IOverlayState.push({ id, component, props })`. The frame renders all stacked entries via `popupIsland.svelte`. Click outside dismisses by default (`dismissOnOutsideClick !== false`).

## Consequences

- `layoutPopup.svelte` is deleted in A.4.2.
- New popups define their own `props` shape — no shared type union needed.
- Stack management is in one service; component lifecycle is the consumer's responsibility.
- Escape key dismisses topmost entry (handled in `popupIsland.svelte`).

## Verification

1. `Glob` for `layoutPopup.svelte` → must return 0.
2. `Grep` for `OverlayStateService` consumers → frame + popupIsland + buttons triggering popups.

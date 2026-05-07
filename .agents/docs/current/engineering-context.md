---
title: Engineering context
type: agent-context
status: active
parent: "[[docs/current/status|current-status]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T19:25:53
tags:
  - agent/current
  - agent/context
  - architecture
---

# Engineering Context

This note captures the standing engineering posture requested by the user on
2026-05-06. Read it with `status.md` and `handoff.md` before designing or
implementing Vaultman work.

## Operating Posture

- Act as a senior fullstack engineer with strong codebase architecture
  experience across generic libraries, agnostic services, and product-specific
  modules.
- Prefer deep modules: small stable interfaces that hide meaningful behavior
  and improve locality.
- Keep implementation aligned with the existing Vaultman architecture before
  introducing new abstractions.
- Use current source research for UI, accessibility, Svelte, Obsidian, or
  platform-specific assumptions when the answer depends on present best
  practice.
- When backlog wording is imprecise, translate it into explicit specs and
  plans instead of scattering inline implementation details.
- Use TDD for behavior changes. Tests should cover public behavior, not private
  helper shapes.
- Use subagents when work can be split into independent write scopes or
  read-only explorations.

## UI And Interaction Posture

- Design dense operational tools as professional working surfaces, not landing
  pages or marketing layouts.
- Selection, focus, hover, active filters, pending operations, and primary
  actions are separate UI concepts. Do not collapse them into one visual state.
- Treat keyboard navigation as a first-class interaction model.
- Use context menus strategically for batch actions and destructive actions.
  Do not hide core actions only in context menus when a direct row or label
  affordance is expected.
- Apple Liquid Glass and gooey motion can inform polish, but motion must not
  compromise legibility, hit targets, responsiveness, or reduced-motion users.
- Prefer crisp state transitions, subtle translucent layers, and responsive
  layout organization over decorative blur or one-note color palettes.

## Documentation Posture

- Preserve technical detail in docs. Do not compress away context to satisfy an
  arbitrary line target.
- Put complete active-work records in the relevant initiative folder and link
  them from `current/status.md` or `current/handoff.md`; do not turn current
  docs into compacted substitutes for the initiative record.
- If a spec or plan is large, shard it. If sharding interrupts capture, write
  the detail first and shard later.
- Current docs may temporarily exceed compactness rules when the user has
  explicitly prioritized fidelity over brevity.

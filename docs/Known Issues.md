---
title: ObsiMan — Known Issues
type:
  - bug-tracker
  - reference
in:
  - "[[ObsiMan]]"
tags:
  - obsidian/plugin
  - bugs
dateCreated: 2026-03-27
dateModified: 2026-04-08
---
# Known Issues

This is the living bug log for ObsiMan. When you find something broken, add it here with the version you're on. AI agents read this before working on fixes — it's the source of truth for what's already known.

**Format for new entries:**
```
- [ ] **Short description** — what happens, what you expected, and how to reproduce it. Version: X.Y.Z
```

Mark a bug as fixed with `[x]` and add `→ Fixed in X.Y.Z` at the end.

---

## v1.0.0-beta.6 — Reported by user (2026-04-08), fixed in Iter.8 (beta.7)

### 🔴 Critical / Data integrity

- [x] **Rename value scope processes entire vault** — `getFilesWithValue()` helper added to `PropertyExplorerComponent` that intersects operation scope with files that actually have the target property+value. → Fixed in 1.0.0-beta.7

- [x] **File/folder search filters are isolated to Files page** — `FilterService.setSearchFilter(name, folder)` added; the Files page search `$effect` now calls it so all pages share the filter state. Name and folder fields are now correctly isolated. → Fixed in 1.0.0-beta.7

- [x] **Queue list popup is still a native Obsidian popup** — new `QueueIslandComponent` replaces the native popup; Ops FAB now toggles a floating island above the bottom bar with squircle buttons. → Fixed in 1.0.0-beta.7

### 🟡 UX bugs

- [x] **Filters badge not showing on pill navbar** — `.obsiman-nav-icon` CSS now has `overflow: visible` so the badge is not clipped. → Fixed in 1.0.0-beta.7

- [x] **Filters tab bar: icons but no text, not centered, wrong style** — both Filters and Ops tab bars now use the same bottom-border style (icon LEFT of label, collapse label under 220px). Ops tabs gained icons. → Fixed in 1.0.0-beta.7

- [x] **Search tab in Filters page requires multiple clicks** — `toggleFiltersTab()` deactivation branch now calls `propExplorer?.toggleSearch()` to close the search bar. → Fixed in 1.0.0-beta.7

- [x] **Display format options (grid/cards) do nothing** — `renderTree()` now branches on `viewFormat`: Grid renders `renderGridView()` (Excel-style table), Cards renders `renderCardsView()` with drill-down. → Fixed in 1.0.0-beta.7

- [x] **Tags-only mode: clicking a tag does not add to active filters** — leaf tag left-click adds a `has_tag` filter rule; right-click shows stub context menu. → Fixed in 1.0.0-beta.7

- [x] **✕ clear button on search bars is outside the input** — input and clear button now wrapped in `.obsiman-explorer-search-input-wrap` (position: relative); clear button is absolutely positioned inside on the right. → Fixed in 1.0.0-beta.7

- [x] **Property values with 0 occurrences shown when filter active** — value render loop now skips values with `count === 0` when `filterScope !== 'all'`. → Fixed in 1.0.0-beta.7

- [x] **obsiman-view-header wastes vertical space** — `<div class="obsiman-view-header">` removed; `use:bindViewRoot` moved to the viewport div. → Fixed in 1.0.0-beta.7

- [x] **Property type icon not shown in explorer** — `showPropIcon` and `showPropName` toggles added (both default true); type icon default changed to false (off by default, user can enable). Toggle is now functional. → Fixed in 1.0.0-beta.7

---

## v1.0.0-beta.5 — Active bugs

- [ ] **Cola de mover archivos se rompe al añadir más apply changes mientras se está procesando otra cola** — el medidor de progreso se cancela y desaparece si no había terminado de procesar el mover de la cola anterior. Reproducir: aplicar cambios de una cola move files y luego otra antes de que la primera termine. Version: 1.0.0-beta.5

---

## v1.0.0-beta.2 — Pending review

*(These fixes were applied in beta.2. Test each one and leave your notes below — new bugs go in the next section.)*

- [x] **Inline rename broken** — double-clicking the name cell in the property grid does nothing. → Fixed in 1.0.0-beta.2
- [x] **Header checkbox lost CSS** — the "select all" checkbox lost its accent/indeterminate styling. → Fixed in 1.0.0-beta.2
- [x] **Grid re-render flash** — visible re-render on each click or row update. → Fixed in 1.0.0-beta.2
- [x] **Tags don't render like reading view** — `#hashtags` showed as plain text. → Fixed in 1.0.0-beta.2

---

## v0.9.0 — Confirmed placeholders (not bugs, just not built yet)

- [ ] **File diff view** — modal skeleton exists but diff rendering not implemented. Version: 0.9.0
- [ ] **Move to folder** — Move tab present but file move logic not implemented. Version: 0.9.0
- [ ] **Pattern-based rename** — Rename tab exists but pattern substitution not working. Version: 0.9.0
- [ ] **Linter tab** — visible but template-based property ordering not functional. Version: 0.9.0
- [ ] **Templates tab** — Templater plugin integration stubbed but does nothing. Version: 0.9.0

---

## Resolved

- [x] **Checkbox toggle always cleared selection** → Fixed in 0.9.0
- [x] **Show only checked showed wrong files** → Fixed in 0.9.0
- [x] **Files/properties not appearing in views** — race condition with metadataCache. → Fixed in 0.8.0

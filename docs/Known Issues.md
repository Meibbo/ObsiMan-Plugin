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

## v1.0.0-beta.6 — Reported by user (2026-04-08), target fix: Iter.8+

### 🔴 Critical / Data integrity

- [ ] **Rename value scope processes entire vault** — when renaming a property value with no active filters, the operation queues every file in the vault instead of only files that contain that property+value. Expected: only files where the property has that specific value are processed. Very slow on large vaults. Version: 1.0.0-beta.6

- [ ] **File/folder search filters are isolated to Files page** — filters entered in the Files page search FAB (name field + folder field) are not reflected in: active filters popup, pill navbar badge, stats bar ("X filtered"), or Ops page scope. Only the Files page grid respects them. Expected: they should be fed into FilterService so all pages share the same filter state. Additionally, the name and folder fields are mixed — typing in the folder field also matches file names, and vice versa. Version: 1.0.0-beta.6

- [ ] **Queue list popup is still a native Obsidian popup** — clicking the Ops FAB opens a native Obsidian popup instead of an in-frame floating island. Spec: should be an iOS-style notification island floating above the bottom bar (not covering it), with squircle buttons centered as in the wireframe. Version: 1.0.0-beta.6

### 🟡 UX bugs

- [ ] **Filters badge not showing on pill navbar** — the Filters icon in the pill navbar never shows a badge even when filters are active. Ops badge works correctly. Likely: `filterRuleCount` is not being updated in the pill navbar template or `updateStats()` is not called on the right events. Version: 1.0.0-beta.6

- [ ] **Filters tab bar: icons but no text, not centered, wrong style** — the 4-tab toolbar in the Filters page shows icons correctly but the text labels are not visible and tabs are not centered. Tab bar does not share visual style with the Ops page sub-tab bar. The Ops tabs should also gain icons (reference the old ObsiManExplorerView toolbar for the correct icon set). Version: 1.0.0-beta.6

- [ ] **Search tab in Filters page requires multiple clicks** — the Search tab should toggle the search bar open on first click and close it on second click. Currently requires more interactions. Version: 1.0.0-beta.6

- [ ] **Display format options (grid/cards) do nothing** — selecting Grid or Cards in the View panel has no effect. Only Tags-only mode works. Root cause: `setViewOptions()` stores the format but `renderTree()` does not branch on `this.viewFormat`. Version: 1.0.0-beta.6

- [ ] **Tags-only mode: clicking a tag does not add to active filters** — in Tags-only view, clicking a tag in the tree should add a filter rule (e.g. `has_tag: #animal/dog`). Currently nothing happens. Version: 1.0.0-beta.6

- [ ] **✕ clear button on search bars is outside the input** — the clear button renders to the right of the search input container, not inside it at the far right. Should be positioned inside the input element, right-aligned. Version: 1.0.0-beta.6

- [ ] **Property values with 0 occurrences shown when filter active** — when a scope filter is applied, properties that have no matching values in the filtered set still show all their values (with 0 count). They should be hidden entirely. Version: 1.0.0-beta.6

- [ ] **obsiman-view-header wastes vertical space** — the "ObsiMan" heading at the top of the plugin frame takes vertical space on every page. Should be removed; the plugin is self-evident in context. Version: 1.0.0-beta.6

- [ ] **Property type icon not shown in explorer** — the View panel has a toggle for showing/hiding the property type icon (list, text, checkbox, date, etc). The toggle exists but the icon is never rendered regardless of its state. The frequency count IS shown by default — the type icon should also be shown by default and be togglable. Version: 1.0.0-beta.6

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

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
dateModified: 2026-03-28
---
# Known Issues

This is the living bug log for ObsiMan. When you find something broken, add it here with the version you're on. AI agents read this before working on fixes — it's the source of truth for what's already known.

**Format for new entries:**
```
- [ ] **Short description** — what happens, what you expected, and how to reproduce it. Version: X.Y.Z
```

Mark a bug as fixed with `[x]` and add `→ Fixed in X.Y.Z` at the end.

---

## v1.0.0-beta.2 — Pending review

*(These fixes were applied in beta.2. Test each one and leave your notes below — new bugs go in the next section.)*

- [x] **Inline rename broken** — double-clicking the name cell in the property grid does nothing (the edit input doesn't appear). Expected: the cell becomes editable in place. How to reproduce: open the main view, hover over any file name cell, double-click. Version: 0.9.0 → Fixed in 1.0.0-beta.2
	-
- [x] **Header checkbox lost CSS** — the "select all" checkbox in the grid header has lost its accent/indeterminate styling. Still functions, just visually unstyled. Version: 0.9.0 → Fixed in 1.0.0-beta.2
	-
- [x] **Grid re-render flash** — when MarkdownRenderer updates a cell (chunked or all-at-once mode), you can visually see the render happening on each click or row update. Most noticeable when clicking between rows quickly. Version: 0.9.0 → Fixed in 1.0.0-beta.2
	-
- [x] **Tags don't render like reading view** — `#hashtags` in property values show the `#` symbol and the tag text as plain text instead of rendering as styled tag chips like Obsidian's live/reading preview. Version: 0.9.0 → Fixed in 1.0.0-beta.2
	-

---

## v1.0.0-beta.2 — Active bugs

*(Add new bugs found after testing beta.2 here)*

---

## v0.9.0 — Confirmed placeholders (not bugs, just not built yet)

- [ ] **File diff view** — the modal skeleton exists but the actual diff rendering between "before" and "after" frontmatter is not implemented. No visual output appears when you try to open it. Version: 0.9.0
- [ ] **Move to folder** — the Move tab in the operations panel is present but the underlying file move logic is not implemented. Version: 0.9.0
- [ ] **Pattern-based rename** — the Rename tab exists but the pattern substitution logic (placeholders like `{{title}}`) is not working. Version: 0.9.0
- [ ] **Linter tab** — visible but the template-based property ordering is not functional. Version: 0.9.0
- [ ] **Templates tab** — Templater plugin integration is stubbed but does nothing. Version: 0.9.0

---

## Resolved

*(Move fixed bugs here with version where they were fixed)*

- [x] **Checkbox toggle always cleared selection** — clicking a checkbox was always calling deselect+select instead of toggling, making uncheck impossible. → Fixed in 0.9.0
- [x] **Show only checked showed wrong files** — `showOnlySelected` was showing only the last selected file due to the above checkbox bug. → Fixed in 0.9.0
- [x] **Files/properties not appearing in views** — race condition with Obsidian's `metadataCache` — the index was built before the cache was ready. Fixed by subscribing to `metadataCache.on('resolved')`. → Fixed in 0.8.0

# ObsiMan

![Version](https://img.shields.io/github/v/release/Meibbo/ObsiMan-Plugin)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.7.0-purple)

> Bulk property editor, file manager, and content search tool for Obsidian — built to augment what's already there.

ObsiMan grew out of frustration with Obsidian's native and community tools for managing properties at scale. Once you have hundreds of notes, the built-in properties view gets limiting fast: you can see your properties listed, rename them one at a time, and that's about it.

ObsiMan is a **control panel for your vault** — filter your files, select what you care about, queue up a batch of operations, preview exactly what will change, and apply everything at once.

It doesn't replace Search, Bases, Linter, or Tag Wrangler. It adds what they're missing.

---

> [!WARNING] **Beta — v1.0.0-beta.5**
>
> Core features are functional and tested. Some UI tabs are still placeholders. See [Known placeholders](#known-placeholders) before diving in.

---

## Features

### 3-page sidebar navigation (Ops | Files | Filters)

The main interface is a compact sidebar with three pages that slide horizontally. Navigate by tapping the bottom pill nav. Long-press any nav icon (2 seconds) to enter reorder mode and drag pages to your preferred order.

Each page has a **floating action button (FAB)** on its outer edge:
- **Ops page** — opens the Queue Details modal (full diff view + execute)
- **Files page** — two FABs: View mode switcher and File search popup
- **Filters page** — opens the Active Filters popup

### Files page

- Scrollable file list of all vault files (or filtered/selected subset)
- Checkbox selection with Ctrl+click, Shift+click, and Select All
- File search popup: filter by name and folder
- View mode popup: Selected only / Grid / Masonry / Property columns

### Filters page — Rules tab

**Property browser**: a live scrollable list of every property in your vault, built from the frontmatter index.

- Click a property name → immediately adds a `has_property` filter (no modal)
- Expand ▶ any property → see all its known values
- Click a value → adds a `specific_value` filter directly

For more complex rules, the **Add Filter** button opens a modal with the full filter builder (AND/OR/NOT groups, 8 filter types, autocomplete). Save your filter combos as templates and reload them later.

The **Active Filters popup** (FAB) shows your current rule tree and lets you clear or add rules.

### Filters page — Scope tab

Choose the target scope for all operations:
- **All vault** — every markdown file
- **Filtered files** — files that pass your current filter rules
- **Selected files** — only the files you've checked

The Ops page badge and Content tab adapt to this selection automatically.

### Ops page — File Ops tab

Stage property operations on filtered/selected files:

| Operation | What it does |
|-----------|-------------|
| Rename | Batch rename files with pattern support |
| Add property | Add or set a property value across files |
| Move | Move files to a target folder |

Operations are staged in a queue — nothing changes until you review and apply. The queue badge on the Ops nav icon shows pending count.

**Queue Details modal** (via FAB or Apply button):
- Collapsible per-file property diff (before → after, color-coded)
- Content snippet diffs for Find & Replace operations
- Execute all changes at once (chunked, 20 files/tick, live progress Notice)

### Ops page — Content tab (Find & Replace)

Search and replace raw file content — including frontmatter — across your filtered/selected files.

- Plain text or **regex** search (`.*` toggle)
- **Case sensitive** toggle (`Aa`)
- **Preview**: shows match count + collapsible per-file snippet list with highlighted matches
- **Queue Replace**: stages the operation — review in Queue Details before applying

When queued, Queue Details shows snippet-style diffs: `…before [MATCH → replacement] after…`

### Ops page — Linter tab

Run Obsidian Linter on your filtered/selected files in batch. Requires the [Obsidian Linter](https://github.com/platers/obsidian-linter) community plugin.

---

## Workflow

1. Go to **Filters** → set up rules (or use the property browser to click-add filters fast)
2. Set **Scope** (Filtered files is the default)
3. Go to **Files** → verify what's selected; adjust with checkboxes if needed
4. Go to **Ops** → queue operations (property changes, rename, move, or find & replace)
5. Open **Queue Details** (Ops FAB) → review the diff → **Apply**

---

## Known placeholders

Some tabs exist in the UI but aren't fully wired yet:

| Feature | Status |
|---------|--------|
| Pattern-based rename (`{{title}}`, `{{date}}`) | UI exists, substitution not working |
| File diff view in queue | Skeleton only, no rendering |
| Templates tab (Templater) | Stubbed |

---

## Installation

### Via BRAT (recommended)
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the community plugins store
2. In BRAT settings → **Add Beta Plugin**
3. Enter `Meibbo/ObsiMan-Plugin`
4. Enable **ObsiMan** in Settings → Community Plugins

### Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Meibbo/ObsiMan-Plugin/releases/latest)
2. Create folder `<vault>/.obsidian/plugins/obsiman/`
3. Drop the three files in and reload Obsidian
4. Enable in Settings → Community Plugins

*ObsiMan is not yet in the official Obsidian plugin store. That's the goal for 1.0.0.*

---

## Settings reference

| Setting | What it does | Default |
|---------|-------------|---------|
| Language | UI language — Auto, English, or Spanish | Auto |
| Default property type | Type for new properties | text |
| Ctrl+click search | Opens Obsidian search on Ctrl+click in property explorer | On |
| Queue preview | Highlights pending changes in the explorer | On |
| Operation scope | Default target scope (auto / filtered / selected / all) | Auto |
| Page order | Order of sidebar pages — drag to reorder in-app | ops, files, filters |

---

## Development

```bash
git clone https://github.com/Meibbo/ObsiMan-Plugin
cd ObsiMan-Plugin
npm install
npm run dev    # watch mode with sourcemaps
npm run build  # tsc type-check + esbuild production bundle
npm run lint   # ESLint with obsidianmd rules
```

See [AGENTS.md](AGENTS.md) for full architecture docs and coding patterns (written for AI coding assistants but readable for humans).

---

## License

[MIT](LICENSE) — [Meibbo](https://github.com/Meibbo)

# ObsiMan

![Version](https://img.shields.io/github/v/release/Meibbo/ObsiMan-Plugin)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.7.0-purple)

ObsiMan is a Swiss Army Knife of Obsidian tools for managing the files of your vault at scale. Once you have hundreds of notes, the built-in properties view gets limiting fast: you can see your tags and properties listed, rename them one at a time, and that's about it.

ObsiMan is a **control panel for your vault** — it can filter your files, select what you care about, queue up a batch of operations, preview exactly what they will change and apply everything at once.

---

## Features

### Multi page sidebar navigation
The main interface is a compact modular sidebar that lets you choose its content within the available options. With a bottom bar to navigate between pages and a top bar for their subpages, with reorganizing modals and llamative fab buttons for the most important options: Active filters and a Queue list.

### Filter tabs
Every page has a header for searching, scopes, sorts and different view that affects individually your contents and lets **filter** out the exact options you wanted to select for different kinds of operations. 

Also, they have with dynamic context menus for quick ops that you would love. Every selected element will apear in the *Active filters popup*, where you can strategically add logical groups (all/any/none), supress filters, **clear all** or even templates of filters for fast deploy.

**Property browser**: a live scrollable list of every property and value in your vault, built from the frontmatter index.

**Tag wrangler**: a hierarchical tree list 

**Tag wrangler**: a tree list that gives you power to rearrenge your tags

%%Everything below is just a placeholder, I'm working on it%%

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

# ObsiMan

![Version](https://img.shields.io/github/v/release/Meibbo/obsiman)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.7.0-purple)

> Bulk YAML & file editor tool for a better vault management in Obsidian.

ObsiMan grew out of frustration with Obsidian's native & community tools for making property lists changes. Once you have hundreds of notes and start managing them seriously, the built-in properties view gets limiting fast... you can see all your properties listed, you can rename one at a time, and that's about it. 

I wanted something closer to what bases, tag wrangler and multiProperties do, but better and unified. 

Think of it as a control panel for your frontmatter: filter your whole vault, select the files you care about, queue up a batch of changes, preview exactly what's going to happen, and then apply everything at once.

That's what ObsiMan is.  

---

> [!WARNING] **Early access — v0.9.0 is a private beta**
>
> This is the last development version before the first public beta (1.0.0-beta.1). Several features shown in the UI are **placeholders** for functionality that's still being built. See the [Known Issues](#known-issues) section before diving in so you don't waste time debugging things that are already on the list.

---

## What actually works in v0.9.0

### Property explorer
The right-side tree showing all your vault's properties and values. This part is solid — search, sort by name/count/type, right-click context menus, and icon integration with [Iconic](https://github.com/gfxholo/iconic) if you have it installed. Ctrl+click a property opens Obsidian's native search for that value.

### Spreadsheet grid
The main table view of your files and their properties. Virtual scrolling works well even with large vaults (tested with 1,100+ notes at ~60fps). Column resizing, sortable headers, and Excel-style selection all work — Ctrl+click to toggle, Shift+click for range, header checkbox for all. **Caveat**: the header checkbox lost its accent styling in this version (CSS regression, cosmetic only).

### Filtering
Boolean filter trees with AND / OR / NOT. Eight filter types: by property, missing property, specific value, multiple values, folder, filename, and their exclusion counterparts. Save templates and reload them later. This is probably the most-used feature and it's stable.

### Operations queue
The core workflow: stage operations (set property, rename, delete, change type, clean empty), preview what will change, then apply. The queue preview showing simulated changes works. The diff modal for individual files works too.

### Sessions
Store your current filter + column layout + selection as a session file (saved as `.md` in your `+/` folder). Bidirectional sync — edit the session `.md` externally and the plugin picks up the change. Google Drive sync conflict detection is included.

### `.base` file sync
If you use Obsidian Bases, you can point ObsiMan at a `.base` file and it'll import the column order, sort, and filters from it. Changes you make in ObsiMan (sort, column widths) get written back to the `.base` file too. The expression parser supports the full Bases query syntax.

---

## Known issues

These are confirmed bugs in v0.9.0. Please don't report them as new issues — they're already tracked in [docs/Known Issues.md](docs/Known%20Issues.md).

| Bug | Severity | Status |
|-----|----------|--------|
| **Inline rename broken** — double-clicking a name cell in the grid doesn't work | Medium | Fix planned for 1.0.0-beta.1 |
| **Grid re-render flash** — when MarkdownRenderer updates, you can see the cell visually rebuild on each click | Low/cosmetic | Fix planned |
| **Tags in grid** — `#tags` don't render like they do in Obsidian's reading view (hash symbol stays visible) | Low | Fix planned |
| **Header checkbox lost CSS** — the "select all" checkbox in the grid header lost its accent/indeterminate styling | Cosmetic | Fix planned |

---

## What's placeholder / not yet implemented

Some tabs and sections exist in the UI but aren't fully wired up yet. Honest rundown:

- **File operations tab** — the Move, Rename (pattern-based), and Linter tabs in the operations panel exist but most of the underlying logic isn't fully implemented or has known issues. Don't rely on these for anything important yet.
- **File diff view** — the idea is to show a side-by-side diff of a file's frontmatter before/after your pending changes. The modal skeleton exists but the diff rendering isn't implemented.
- **Templates tab** — Obsidian Templater integration is stubbed but not functional.
- **Mobile** — `isDesktopOnly` is set to `false` but mobile hasn't been properly tested. It may work, it may not. Consider it unsupported for now.

---

## Roadmap to 1.0.0

The goal for `1.0.0-beta.1` (distributed via BRAT for public testing):

- [ ] Fix inline rename
- [ ] Fix tag rendering in grid
- [ ] Fix header checkbox CSS
- [ ] Fix grid re-render flash
- [ ] Implement file diff view
- [ ] File move operation (move selected files to a folder)
- [ ] Basic Linter tab (apply property order template)

The goal for `1.0.0` (official Obsidian community store submission):

- [ ] All of the above stable
- [ ] Mobile tested or explicitly disabled
- [ ] Proper README screenshots/GIFs
- [ ] Full testing pass on Obsidian 1.7.0+

---

## Installation

### Via BRAT (recommended for now)
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian community plugins store
2. In BRAT settings, click **Add Beta Plugin**
3. Enter `Meibbo/obsiman`
4. Enable **ObsiMan** in Settings → Community Plugins

### Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Meibbo/obsiman/releases/latest)
2. Create the folder `<vault>/.obsidian/plugins/obsiman/`
3. Drop the three files in and reload Obsidian
4. Enable in Settings → Community Plugins

*ObsiMan is not yet in the official Obsidian plugin store. That's the goal for 1.0.0.*

---

## How to use it

### Opening the plugin
- **Ribbon**: click the ObsiMan icon in the left sidebar
- **Command palette**: `ObsiMan: Open full view` or `ObsiMan: Open sidebar`

### The main workflow
1. Set up a filter (or don't — it works on all files too)
2. Select the files you want to operate on using the grid (Ctrl/Shift/click)
3. In the operations panel, queue up what you want to do to those files
4. Review the queue — you can see a simulated preview before anything actually changes
5. Hit "Apply pending operations"

### Sessions
If you're doing recurring work on the same set of files, save a session. The session file lives in your `+/` folder as a plain `.md` file, so you can read and edit it outside the plugin.

### .base sync
Point the plugin at one of your `.base` files in settings and it'll pull in the column and filter configuration from there. Useful if you've already set up a Bases view that you want to replicate in ObsiMan.

---

## Settings reference

| Setting | What it does | Default |
|---------|-------------|---------|
| Language | UI language — Auto, English, or Spanish | Auto |
| Default property type | Type for new properties | text |
| Ctrl+click search | Opens Obsidian search when you Ctrl+click a property | On |
| Queue preview | Shows pending changes highlighted in the explorer | On |
| Operation scope | What files operations apply to by default | Auto |
| Operations panel position | Where the panel opens — right, bottom, or replace grid | Right |
| Grid rendering mode | How values render in cells — plain, chunked, or all-at-once | Chunk |
| Editable grid columns | Which columns allow inline editing | name |
| Base file path | Path to a `.base` file for bidirectional sync | (empty) |

---

## Development

```bash
git clone https://github.com/Meibbo/obsiman
cd obsiman
npm install
npm run dev    # watch mode for development
npm run build  # production build
npm run lint   # eslint check
```

See [AGENTS.md](AGENTS.md) for architecture docs (primarily written for AI coding assistants, but readable for humans too).

---

## License

[MIT](LICENSE) — [Meibbo](https://github.com/Meibbo)

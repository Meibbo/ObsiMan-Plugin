# ObsiMan

**Bulk property editor and vault management tool for Obsidian.**

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.7.0-purple)

ObsiMan provides a spreadsheet-like interface for managing YAML frontmatter properties across your entire vault. Filter files, batch-edit properties, and manage sessions — all from within Obsidian.

## Features

### Property Explorer
- Hierarchical tree of all properties and their observed values across the vault
- Sort by name, count, type, or values
- Search and filter within the explorer
- Right-click context menus for quick operations
- Ctrl+click to search property values in Obsidian's core search
- Integration with the [Iconic](https://github.com/gfxholo/iconic) plugin for custom property icons

### Spreadsheet Grid
- Virtual-scrolled property grid with inline cell editing
- Column customization, sortable headers, and resizable columns (drag header borders)
- Excel-like selection: Ctrl+click toggle, Shift+click range, Ctrl+Shift range-add, header checkbox with indeterminate state
- Inline file rename via double-click on the name cell
- Live preview rendering: tags, wikilinks, and dates render with Obsidian formatting (configurable: plain, chunked, or all-at-once)
- Fixed column widths independent of cell content
- Mobile-responsive layout

### Advanced Filtering
- Boolean filter trees with AND / OR / NOT logic
- 8 filter types: has_property, missing_property, specific_value, multiple_values, folder, folder_exclude, file_name, file_name_exclude
- Save and load filter templates for reuse

### Operations Queue
- Stage property operations before executing: set, rename, delete, clean empty, change type
- Preview simulated changes before applying
- Pinned queue section always visible at the bottom of the operations panel
- Batch file renaming
- Integration with the Obsidian Linter plugin

### Session Management
- Persistent session files stored as `.md` in a `+/` folder
- Store filters, column layouts, and file selections
- Bidirectional sync — edit session files externally and see changes reflected
- Google Drive conflict detection

### .base File Integration
- Bidirectional sync with Obsidian Bases `.base` files
- Configure a `.base` file path in settings to import columns, sort, column widths, and filters
- Changes in the plugin grid (sort, resize) are written back to the `.base` file
- Full expression parser for Bases query syntax: comparisons, string methods, `file.*` builtins, `link()`, `date()`, nested AND/OR

### Multi-Language Support
- English and Spanish included
- Auto-detection from Obsidian locale

## Installation

### Manual Install
1. Download the latest release from the [Releases](https://github.com/Meibbo/obsiman/releases) page
2. Extract `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/obsiman/` directory
3. Enable **ObsiMan** in Obsidian Settings > Community Plugins

### BRAT (Beta Reviewers Auto-update Tester)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add `Meibbo/obsiman` as a beta plugin in BRAT settings
3. Enable **ObsiMan** in Community Plugins

## Usage

### Opening ObsiMan
- **Ribbon icon**: Click the gear icon in the left sidebar
- **Command palette**: `ObsiMan: Open ObsiMan (full view)` or `ObsiMan: Open ObsiMan sidebar`

### Main View (Full Screen)
The main view provides a complete workspace with:
- **Header bar** — session selector, sync status indicator, queue badge
- **Explorer panel** — collapsible property tree on the left
- **Property grid** — central spreadsheet showing files and their properties
- **Operations panel** — collapsible panel for queuing and executing operations
- **Status bar** — file count and selection statistics

### Sidebar View
A compact version with four collapsible sections:
1. **Explorer** — property tree browser
2. **Filters** — filter editor
3. **Files** — file list with checkboxes
4. **Operations** — queue manager

### Working with Sessions
1. Create a session via the header bar's session selector
2. Session files are stored as markdown in the `+/` folder
3. Filters, columns, and file selections persist across sessions
4. Sessions sync bidirectionally — edit the `.md` file and ObsiMan updates

### Filtering Files
1. Open the filter tree editor
2. Add rules (property-based, folder-based, or filename-based)
3. Combine rules with AND / OR / NOT logic groups
4. Save frequently used filters as templates

### Editing Properties
1. Select files in the grid or file list
2. Right-click a property in the explorer, or use the operations panel
3. Choose an action: set value, rename property, delete, clean empty, or change type
4. Review queued operations
5. Execute with `Apply pending operations` (also available via command palette)

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Language | UI language (Auto, English, Spanish) | Auto |
| Default property type | Type assigned to new properties | text |
| Ctrl+click search | Open Obsidian search on Ctrl+click | Enabled |
| Queue preview | Show pending changes in explorer | Enabled |
| Content search | Enable content search in file tree | Enabled |
| Operation scope | Default scope: auto, selected, filtered, all | Auto |
| Operations panel position | Panel placement: right, bottom, replace | Right |
| Grid rendering mode | How property values render: plain, chunk, all | Chunk |
| Editable columns | Columns allowing inline edit (comma-separated) | name |
| Base file path | Path to a `.base` file for bidirectional sync | (empty) |

## Compatibility

- **Obsidian**: 1.7.0 or later
- **Iconic plugin**: Optional — provides custom property icons when installed
- **Platforms**: Desktop and mobile

## License

[MIT](LICENSE)

## Author

[Meibbo](https://github.com/Meibbo)

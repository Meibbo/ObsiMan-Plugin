# Changelog

All notable changes to ObsiMan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Version history note**: Versions 0.7–0.9 were previously labeled 1.2.2–1.3.0 during private
> internal development. Renumbered to 0.x to reserve 1.0.0 for the first public stable release.

## [Unreleased]

---

## [1.0.0-beta.1] — 2026-03-27

> First public beta. Core features are functional but several known regressions exist. Not recommended for production vaults.

### Added
- Nothing new since 0.9.0 — this release packages the current state for BRAT beta testing

### Known issues in this release
- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling
- Grid re-render flash on click (chunked render mode)
- Tags don't render exactly like Obsidian reading view

### Placeholder / not yet implemented
- File diff view for pending changes
- File move operation
- Linter tab
- Templates tab (Templater support)

---

## [0.9.0] — 2026-03-27

### Added
- **Inline file rename**: double-click a name cell in the grid (configurable via `gridEditableColumns` setting) — *note: currently has a bug, see Known Issues*
- **Live preview rendering**: property values render with Obsidian formatting (tags, wikilinks, dates) via `MarkdownRenderer` — supports plain, chunked, and full render modes — *note: tags still don't render exactly like reading view; chunked mode shows a visible re-render flash*
- **.base file integration**: bidirectional sync between the plugin grid and Obsidian Bases `.base` YAML files — columns, sort, column widths, and filters
- **Base filter parser**: full expression parser for Obsidian Bases query syntax (comparisons, `.contains()`, `.containsAny()`, `file.hasTag()`, `link()`, `date()`, nested AND/OR)
- New settings: `gridRenderMode`, `gridRenderChunkSize`, `gridLivePreviewColumns`, `gridEditableColumns`, `baseFilePath`
- New grid callbacks: `onSortChange` and `onColumnResize` for external sync
- i18n keys for all new settings (English and Spanish)

### Fixed
- **Checkbox toggle**: clicking a checkbox now correctly toggles selection (was always clearing and re-adding, making uncheck impossible)
- **Show only checked**: now correctly shows all selected files (was showing only the last due to checkbox bug)
- **Select all**: header checkbox now immediately updates all row checkboxes without requiring a column sort
- **Column widths**: table now has explicit pixel width matching colgroup sum, preventing columns from shifting with text content
- **Header checkbox accent**: indeterminate/accent styling now only appears when more than one file is selected
- **Ctrl/Shift selection**: separated checkbox click logic from row click logic so modifier keys work correctly on both paths

### Known regressions in this version
- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling

---

## [0.8.0] — 2026-03-26

### Added
- Custom SVG plugin icon registered via `addIcon()` — replaces generic `settings-2` icon on ribbon, view tabs, and sidebar
- **Operations panel**: split layout with a pinned queue section always visible at the bottom, independent of active tab
- **Operations panel**: "Clear selected" button to deselect all files from the grid
- Column resize handles on the property grid — drag column header borders to adjust widths
- Native Obsidian status bar integration — file counts, property/value stats, and queue status
- Minimal session row replacing the colored header bar — session picker and show-selected toggle in a compact row

### Changed
- **Property explorer**: triangle toggle icons (▶/▼) replaced with Lucide chevron icons
- **Navbar**: hidden when the explorer panel is open, shown again when collapsed
- **Operations panel**: opens by default alongside the grid
- **Property grid**: uses a single `<table>` with `table-layout: fixed` and `<colgroup>` for precise column alignment
- **Property grid**: virtual scroll now uses spacer `<tr>` elements inside `<tbody>` instead of separate spacer divs
- Removed custom `.obsiman-statusbar` HTML in favor of Obsidian's native `addStatusBarItem()` API
- Removed `HeaderBarComponent` from the main view

### Fixed
- **Critical**: files and properties not appearing in views due to metadata cache timing — `PropertyIndexService` now rebuilds on `metadataCache.on('resolved')` event
- **Critical**: `FilterService.applyFilters()` re-triggered on `metadataCache.on('resolved')` to ensure filters run after cache is ready
- **Compatibility**: replaced `structuredClone()` with `JSON.parse(JSON.stringify())` for older Electron versions

---

## [0.7.0] — 2026-03-26

### Added
- `onExternalSettingsChange()` lifecycle hook — settings now sync when modified externally (e.g. via cloud sync)
- `onunload()` cleanup in SessionFileService and PropertyIndexService
- `destroy()` method on PropertyExplorerComponent for timer cleanup
- Vault `create` event listener in PropertyIndexService for accurate file count tracking
- README.md with full feature documentation, installation, and usage guide
- CHANGELOG.md following Keep a Changelog format
- CONTRIBUTING.md with architecture overview and development guidelines

### Changed
- **IconicService** and **PropertyTypeService** now extend `Component` with proper lifecycle management
- **PropertyIndexService**: incremental per-file removal on delete (was full vault rebuild)
- **PropertyIndexService**: metadata change handler debounced (50ms) to batch rapid updates
- **FileListComponent** and **PropertyGridComponent**: O(1) `getFileByPath()` lookups instead of O(n) vault scan
- **SessionFileService**: `detectConflicts()` scoped to parent folder instead of full vault scan
- Settings loading uses `structuredClone()` for deep merge

### Fixed
- Potential stale callback execution from pending `setTimeout` in SessionFileService on unload
- Global `document.querySelector` in PropertyExplorerComponent scoped to `ownerDocument`
- `.className = '...'` pattern wiping Obsidian-injected classes

---

## [0.1.0] — 2026-03-25

### Added
- Initial release of ObsiMan as an Obsidian TypeScript plugin
- Property explorer with hierarchical tree view, search, sort, and Iconic integration
- Virtual-scrolled property grid with inline editing
- Advanced filter system with boolean logic (AND/OR/NOT) and 8 filter types
- Operations queue for batch property management (set, rename, delete, clean, change type)
- Session management with persistent `.md` files in `+/` folder
- Bidirectional session sync with Google Drive conflict detection
- File list component with search and checkbox selection
- Batch file renaming modal
- Obsidian Linter integration modal
- Filter template save/load system
- Settings tab with language, property type, layout, and behavior options
- Internationalization support (English, Spanish) with auto-detection
- Sidebar view with collapsible sections
- Full-screen main view with responsive layout
- Ribbon icon and command palette commands

> Versions 0.2–0.6 correspond to the Python script predecessor (PKM Manager).
> See `docs/pkm_manager_python_architecture.md` for that history.

[Unreleased]: https://github.com/Meibbo/ObsiMan-Plugin/compare/1.0.0-beta.1...HEAD
[1.0.0-beta.1]: https://github.com/Meibbo/ObsiMan-Plugin/compare/0.9.0...1.0.0-beta.1
[0.9.0]: https://github.com/Meibbo/ObsiMan-Plugin/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/Meibbo/ObsiMan-Plugin/compare/0.7.0...0.8.0
[0.7.0]: https://github.com/Meibbo/ObsiMan-Plugin/compare/0.1.0...0.7.0
[0.1.0]: https://github.com/Meibbo/ObsiMan-Plugin/releases/tag/0.1.0

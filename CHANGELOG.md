# Changelog

All notable changes to ObsiMan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-27

### Added
- **Inline file rename**: double-click a name cell to rename files directly in the grid (configurable via `gridEditableColumns` setting)
- **Live preview rendering**: property values can render with Obsidian formatting (tags, wikilinks, dates) via `MarkdownRenderer` — supports plain, chunked, and full render modes
- **.base file integration**: bidirectional sync between the plugin grid and Obsidian Bases `.base` YAML files — columns, sort, column widths, and filters
- **Base filter parser**: full expression parser for Obsidian Bases query syntax (comparisons, `.contains()`, `.containsAny()`, `file.hasTag()`, `link()`, `date()`, nested AND/OR)
- New settings: `gridRenderMode`, `gridRenderChunkSize`, `gridLivePreviewColumns`, `gridEditableColumns`, `baseFilePath`
- New grid callbacks: `onSortChange` and `onColumnResize` for external sync
- i18n keys for all new settings (English and Spanish)

### Fixed
- **Checkbox toggle**: clicking a checkbox now correctly toggles selection (was always clearing and re-adding, making uncheck impossible)
- **Show only checked**: now correctly shows all selected files (was showing only the last due to checkbox bug)
- **Select all**: header checkbox now immediately updates all row checkboxes without requiring a column sort (added `force` parameter to `renderVisibleRows`)
- **Column widths**: table now has explicit pixel width matching colgroup sum, preventing columns from shifting with text content
- **Header checkbox accent**: indeterminate/accent styling now only appears when more than one file is selected (no group indication for single selection)
- **Ctrl/Shift selection**: separated checkbox click logic from row click logic so modifier keys work correctly on both paths

## [1.2.3] - 2026-03-26

### Added
- Custom SVG plugin icon registered via `addIcon()` — replaces generic `settings-2` icon on ribbon, view tabs, and sidebar
- **Operations panel**: split layout with a pinned queue section always visible at the bottom, independent of active tab
- **Operations panel**: "Clear selected" button to deselect all files from the grid
- Column resize handles on the property grid — drag column header borders to adjust widths
- Native Obsidian status bar integration — file counts, property/value stats, and queue status now appear in the bottom status bar
- Minimal session row replacing the colored header bar — session picker and show-selected toggle in a compact row

### Changed
- **Property explorer**: triangle toggle icons (▶/▼) replaced with Lucide chevron icons (`chevron-right`/`chevron-down`)
- **Navbar**: hidden when the explorer panel is open, shown again when collapsed
- **Operations panel**: opens by default alongside the grid
- **Property grid**: uses a single `<table>` with `table-layout: fixed` and `<colgroup>` for precise column alignment between header and body
- **Property grid**: virtual scroll now uses spacer `<tr>` elements inside the same `<tbody>` instead of separate spacer divs and a second table
- Removed custom `.obsiman-statusbar` HTML in favor of Obsidian's native `addStatusBarItem()` API
- Removed `HeaderBarComponent` from the main view (colored toolbar with session picker, sync indicator, queue badge, and apply button)

### Fixed
- **Critical**: files and properties not appearing in views due to metadata cache timing — `PropertyIndexService` now rebuilds on the `metadataCache.on('resolved')` event
- **Critical**: `FilterService.applyFilters()` is now re-triggered on `metadataCache.on('resolved')` to ensure filters run after the cache is ready
- **Compatibility**: replaced `structuredClone()` with `JSON.parse(JSON.stringify())` in settings loading for older Electron versions

## [1.2.2] - 2026-03-26

### Added
- `onExternalSettingsChange()` lifecycle hook — settings now sync when modified externally (e.g. via cloud sync)
- `onunload()` cleanup in SessionFileService to clear pending debounce timers
- `onunload()` cleanup in PropertyIndexService to clear pending metadata flush timers
- `destroy()` method on PropertyExplorerComponent for timer cleanup
- `authorUrl` field in manifest.json
- Vault `create` event listener in PropertyIndexService for accurate file count tracking
- README.md with full feature documentation, installation, and usage guide
- CHANGELOG.md following Keep a Changelog format
- CONTRIBUTING.md with architecture overview and development guidelines

### Changed
- **IconicService** now extends Obsidian's `Component` class with proper lifecycle management via `addChild()`
- **PropertyTypeService** now extends Obsidian's `Component` class with proper lifecycle management via `addChild()`
- **PropertyIndexService**: replaced full vault rebuild on file delete with incremental per-file removal
- **PropertyIndexService**: metadata change handler is now debounced (50ms) to batch rapid updates during bulk operations
- **PropertyIndexService**: `fileCount` is now updated incrementally via vault create/delete events instead of calling `getMarkdownFiles().length` on every metadata change
- **FileListComponent** and **PropertyGridComponent**: `getSelectedFiles()` now uses O(1) `getFileByPath()` lookups instead of O(n) vault scan
- **SessionFileService**: `detectConflicts()` now scopes search to parent folder children instead of scanning the full vault
- Settings loading uses `structuredClone()` for deep merge instead of `Object.assign()` shallow copy, preventing shared references on nested arrays/objects
- Sync status indicators in HeaderBarComponent and ToolbarComponent use `addClass()`/`addClasses()` instead of overwriting `.className`
- Bumped version to 1.2.2 across manifest.json, package.json, and versions.json

### Fixed
- Potential stale callback execution from pending `setTimeout` in SessionFileService when the service is unloaded
- Pending `setTimeout` in PropertyExplorerComponent now tracked and cleared on view close
- Global `document.querySelector` in PropertyExplorerComponent scoped to `ownerDocument` to avoid collisions with other plugins
- `.className = '...'` pattern in HeaderBarComponent and ToolbarComponent that wiped all classes including Obsidian-injected ones
- Stray semicolon on empty line in ObsiManSettingsTab
- Internal Obsidian API usage in LinterModal now documented with comments

## [0.1.0] - 2026-03-25

### Added
- Initial release of ObsiMan
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

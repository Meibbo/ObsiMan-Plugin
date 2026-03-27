# Contributing to ObsiMan

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm
- [Obsidian](https://obsidian.md/) with developer mode enabled (Settings > Community Plugins > Turn on community plugins)

## Development Setup

1. Clone the repository into your vault's plugin directory:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/Meibbo/obsiman.git
   cd obsiman
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development build (watch mode with sourcemaps):
   ```bash
   npm run dev
   ```

4. Enable the plugin in Obsidian: Settings > Community Plugins > ObsiMan

5. Use Ctrl+Shift+I to open the developer console for debugging.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Continuous build with watch mode and sourcemaps |
| `npm run build` | Production build (type-check + minified bundle) |
| `npm run lint` | Run ESLint with Obsidian-specific rules |

## Architecture Overview

```
main.ts                    # Plugin entry point — lifecycle, commands, ribbon
src/
  services/                # Core business logic (extend Component)
    PropertyIndexService   # Live index of all frontmatter properties/values
    FilterService          # Filter tree management and evaluation
    OperationQueueService  # Stages and executes property operations
    SessionFileService     # Session .md file read/write and sync
    IconicService          # Iconic plugin icon lookup
    PropertyTypeService    # .obsidian/types.json read/write
  views/                   # Obsidian ItemView implementations
    ObsiManView            # Sidebar view (4 collapsible sections)
    ObsiManMainView        # Full-screen view (header, grid, explorer)
  components/              # UI components (plain classes)
    PropertyExplorerComponent  # Hierarchical property tree
    PropertyGridComponent      # Virtual-scrolled spreadsheet
    FileListComponent          # Checkable file list
    FilterTreeComponent        # Visual filter tree editor
    QueueListComponent         # Pending operations list
    HeaderBarComponent         # Top bar controls
    NavbarComponent            # Explorer toggle + filter buttons
    OperationsPanelComponent   # Operation queuing UI
    ToolbarComponent           # Alternate toolbar (sidebar)
    FileFilterPopoverComponent # Popover for file filtering
    StatusBarComponent         # Status bar statistics
  modals/                  # Modal dialogs (extend Modal)
    AddFilterModal         # Create filter rules/groups
    PropertyManagerModal   # Queue property operations
    QueueDetailsModal      # View/manage queued operations
    FileRenameModal        # Batch file renaming
    LinterModal            # Obsidian Linter integration
    SaveTemplateModal      # Save filter template
    CreateSessionModal     # Create new session file
  types/                   # TypeScript type definitions
    filter.ts              # FilterNode, FilterGroup, FilterRule
    operation.ts           # PendingChange, OperationResult
    session.ts             # ObsiManSession
    settings.ts            # ObsiManSettings, DEFAULT_SETTINGS
  utils/                   # Utility functions
    filter-evaluator.ts    # Pure function: evalNode() for filter evaluation
    autocomplete.ts        # PropertySuggest (AbstractInputSuggest)
  i18n/                    # Internationalization
    index.ts               # t() function, setLanguage()
    en.ts                  # English translations
    es.ts                  # Spanish translations
  settings/
    ObsiManSettingsTab.ts  # Plugin settings tab
```

## Key Development Patterns

### Service Lifecycle

All services extend Obsidian's `Component` class and are registered via `addChild()` in the plugin's `onload()`. This ensures automatic lifecycle management:

```typescript
// In main.ts onload():
this.myService = new MyService(this.app);
this.addChild(this.myService);  // Calls onload(), auto-calls onunload() later
```

### Event Registration

Always use `registerEvent()` for Obsidian events — this ensures automatic cleanup on unload:

```typescript
// Good — auto-cleaned
this.registerEvent(
  this.app.vault.on('modify', (file) => { ... })
);

// Bad — leaks on unload
this.app.vault.on('modify', (file) => { ... });
```

### DOM Construction

Use Obsidian's DOM helpers instead of raw HTML:

```typescript
// Good
const div = containerEl.createDiv({ cls: 'my-class' });
div.createEl('span', { text: 'Hello' });

// Bad
containerEl.innerHTML = '<div class="my-class"><span>Hello</span></div>';
```

### Class Management

Toggle specific CSS classes rather than overwriting `.className`:

```typescript
// Good
el.addClass('my-modifier');
el.removeClass('old-modifier');

// Bad — wipes all classes including Obsidian's
el.className = 'my-class my-modifier';
```

### File Lookups

Use O(1) path-based lookups instead of filtering the full vault:

```typescript
// Good — O(1)
const file = this.app.vault.getFileByPath(path);

// Bad — O(n) full vault scan
const file = this.app.vault.getMarkdownFiles().find(f => f.path === path);
```

### Performance Guidelines

- **Debounce** expensive operations triggered by vault events (metadata changes, file modifications)
- **Batch** updates when processing multiple files
- **Cache** computed values and invalidate on relevant events
- **Scope** DOM queries to component containers, not `document`
- **Virtual scroll** for large lists (see PropertyGridComponent)

## Testing Checklist

Before submitting changes, verify manually in Obsidian:

- [ ] Plugin loads without console errors
- [ ] Sidebar and main views open and display correctly
- [ ] Property explorer shows all vault properties
- [ ] Filters apply correctly (AND/OR/NOT logic)
- [ ] Grid displays files with correct property values
- [ ] Inline cell editing saves changes
- [ ] Operations queue: add, preview, execute, clear
- [ ] Sessions: create, load, save, switch
- [ ] Disable and re-enable plugin (no memory leaks)
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`

## Release Process

1. Update version in `manifest.json`, `package.json`, and `versions.json`
2. Update `CHANGELOG.md` with the new version's changes
3. Commit and tag the release:
   ```bash
   git tag 1.2.3
   git push origin main --tags
   ```
4. Create a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached

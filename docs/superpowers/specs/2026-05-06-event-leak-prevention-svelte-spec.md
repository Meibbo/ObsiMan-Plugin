# Spec: Event Leak Prevention & Svelte Integration (A.2) - EXHAUSTIVE TECHNICAL SPEC

## Objective
Svelte 5 component (`frameVaultman.svelte`) registers global Obsidian events directly against `plugin.app.metadataCache.on` within an `onMount` block without unregistering them safely, causing memory leaks when the Vaultman leaf is closed but Obsidian stays open. 
This spec introduces a reactive `Svelte 5 Runes` wrapper and an exact unmount strategy.

---

## 1. Reactive Index Wrapper: `src/services/serviceReactiveIndex.svelte.ts`

**Action:** Create a reusable Svelte 5 class that wraps any `INodeIndex`, removing the need for manual `.subscribe` boilerplate in UI components.

**Exact File Creation (`src/services/serviceReactiveIndex.svelte.ts`):**
```typescript
import type { INodeIndex } from '../types/typeContracts';

export class ReactiveIndex<TNode> {
	nodes = $state<TNode[]>([]);
	private unsub: () => void;

	constructor(private index: INodeIndex<TNode>) {
		// Initialize with current state
		this.nodes = [...index.nodes];
		
		// Reactively sync
		this.unsub = index.subscribe(() => {
			this.nodes = [...index.nodes];
		});
	}

	destroy() {
		this.unsub();
	}
}
```

---

## 2. Refactor `VaultmanFrame` (Leaf): `src/types/typeFrame.ts`

**Action:** Inject the `Leaf` instance into the Svelte tree so components can bind events to the Leaf's lifecycle, rather than the global app.

**Exact Change in `src/types/typeFrame.ts` `onOpen`:**
```typescript
	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vm-frame');

		this.svelteApp = mount(VaultmanFrameSvelte as unknown as Component<{ plugin: VaultmanPlugin, leaf: VaultmanFrame }>, {
			target: contentEl,
			props: { plugin: this.plugin, leaf: this },
		});
	}
```

---

## 3. Safe Event Binding: `src/components/frame/frameVaultman.svelte`

**Action:** 
1. Accept `leaf` prop.
2. Bind Obsidian events using `leaf.registerEvent` instead of raw `.on()`. This guarantees zero leaks when the Leaf is destroyed.
3. Remove manual `.subscribe` to indices.

**Exact Code Changes in `<script>` tag:**

**Change A: Props**
```typescript
	let { plugin, leaf }: { plugin: VaultmanPlugin, leaf: import('../../types/typeFrame').VaultmanFrame } = $props();
```

**Change B: Replace `onMount` event handling**
Delete the old `onVaultResolved` logic inside `onMount`:
```typescript
// DELETE THIS OLD CODE:
// const onVaultResolved = () => { refreshFiles(); };
// plugin.app.metadataCache.on('resolved', onVaultResolved);
// plugin.app.metadataCache.off('resolved', onVaultResolved);
```

**Insert Safe Registration (At component root or inside onMount):**
```typescript
	onMount(() => {
		const onFilterChanged = () => {
			refreshFiles();
			refreshActiveFilterHighlights();
			updateStats();
		};
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && plugin.overlayState.isOpen('queue')) {
				overlays.closeQueueIsland();
			}
		};

		const unsubFilter = plugin.filterService.subscribe(onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshQueue();

		// THE FIX: Bind the event directly to the Obsidian Leaf's lifecycle.
		// When the Leaf closes, Obsidian's Component manager automatically unbinds this.
		leaf.registerEvent(
			plugin.app.metadataCache.on('resolved', () => {
				refreshFiles();
			})
		);

		return () => {
			unsubFilter();
			plugin.queueService.off('changed', onQueueChanged);
		};
	});
```

---

## 4. Addressing ViewService Reactivity Scope (`src/services/serviceViews.svelte.ts`)

**Action:** Currently `ViewService` is instantiated globally in `main.ts`, sharing `$state` (`this.selections`, `this.expanded`) across all leaves (tabs). This violates multi-instance behavior.

**Resolution:**
The `SvelteMap` implementation in `ViewService` is actually correctly keyed by `explorerId`:
```typescript
private readonly modes = new SvelteMap<string, ExplorerViewMode>();
private readonly selections = new SvelteMap<string, SvelteSet<string>>();
```
Since `explorerId` is inherently unique per tree/tab context in Vaultman's UI generation, the global singleton pattern here is *technically safe* as long as each visual explorer generates a unique `explorerId` for its instance. 

*No changes required to `serviceViews.svelte.ts` at this stage, but it is explicitly documented here that the security relies on `explorerId` uniqueness.*

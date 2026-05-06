# Research: Obsidian Component Lifecycle & Child Registry

## Context
Vaultman uses functional factories (`createFilesIndex`, `createNodeIndex`) to manage state. These are plain objects held as properties on the `VaultmanPlugin` class. 

## Problems Detected
1. **Manual Cleanup**: Events are registered in `main.ts` using `this.registerEvent(...)`, but the indices themselves have no internal "onUnload" hook.
2. **Implicit Dependency**: Indices depend on `app` or other services but aren't registered in Obsidian's dependency tree (`addChild`).
3. **Svelte Leaks**: Svelte components subscribe to these indices. If a View (Leaf) is closed, the subscriptions must be destroyed.

## Obsidian Lifecycle Model
- **`Component`**: Base class for anything with a lifecycle.
- **`addChild(component)`**: Establishes parent-child relationship. Children are loaded/unloaded with the parent.
- **`registerEvent(...)`**: Automatically unregisters when the component is unloaded.

## Refactoring Strategy: "Component Wrapper"
We can wrap the functional `INodeIndex` into a class `NodeIndexComponent`.

```typescript
export class NodeIndexComponent<TNode extends NodeBase> extends Component implements INodeIndex<TNode> {
    private inner: INodeIndex<TNode>;
    
    constructor(inner: INodeIndex<TNode>) {
        super();
        this.inner = inner;
    }
    
    // Delegate methods...
    get nodes() { return this.inner.nodes; }
    refresh() { return this.inner.refresh(); }
    subscribe(cb: () => void) { return this.inner.subscribe(cb); }
    byId(id: string) { return this.inner.byId(id); }
    
    onload() {
        // Register internal events here
    }
}
```

## Integration with Svelte
Svelte components should use `getContext` to retrieve these services from the `VaultmanFrame` (Leaf). The Leaf, as a `Component`, should manage the instance-specific state if we move to multi-instance.

## Findings for Spec 1
- `main.ts` should not handle the `refresh()` calls for every index.
- Each `IndexComponent` should register its own listeners (e.g., `vault.on('create', ...)`) within its `onload`.
- This moves 50+ lines of orchestration from `main.ts` into the respective services.

## Findings for Spec 2
- Svelte 5 Runes can wrap `INodeIndex` to make them globally reactive without manual `subscribe`.
- A `useService` hook in Svelte can ensure that we are accessing the service scoped to the current Leaf.

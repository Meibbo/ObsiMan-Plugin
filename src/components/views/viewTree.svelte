<script lang="ts">
  import type { TreeNode } from "../../types/typeTree";
  import { TreeVirtualizer } from "../../services/serviceVirtualizer";

  interface Props {
    nodes: TreeNode[];
    expandedIds: Set<string>;
    onToggle: (id: string) => void;
    onRowClick: (id: string) => void;
    onContextMenu: (id: string, e: MouseEvent) => void;
    activeFilterIds?: Set<string>;
    searchHighlightIds?: Set<string>;
    warningIds?: Set<string>;
    editingId?: string | null;
    onRename?: (id: string, newLabel: string) => void;
    onCancelRename?: () => void;
    onBadgeDoubleClick?: (queueIndex: number) => void;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
  }

  let {
    nodes,
    expandedIds,
    onToggle,
    onRowClick,
    onContextMenu,
    activeFilterIds,
    searchHighlightIds,
    warningIds,
    editingId,
    onRename,
    onCancelRename,
    onBadgeDoubleClick,
    icon,
  }: Props = $props();

  const virtualizer = new TreeVirtualizer();

  let outerEl: HTMLDivElement | undefined = $state();
  let scrollTop = $state(0);
  let viewportH = $state(0);
  let rowH = $state(32);

  const flatArray = $derived(virtualizer.flatten(nodes, expandedIds));
  const totalH = $derived(flatArray.length * rowH);
  const win = $derived(
    virtualizer.computeWindow(scrollTop, viewportH, rowH, flatArray.length),
  );
  const visibleSlice = $derived(flatArray.slice(win.startIndex, win.endIndex));

  function onScroll(e: Event) {
    scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
  }

  $effect(() => {
    if (!outerEl) return;
    const cs = getComputedStyle(outerEl);
    const v = parseFloat(cs.getPropertyValue("--vm-tree-row-h"));
    if (v > 0) rowH = v;
    viewportH = outerEl.clientHeight;
    const ro = new ResizeObserver(() => {
      if (outerEl) viewportH = outerEl.clientHeight;
    });
    ro.observe(outerEl);
    return () => ro.disconnect();
  });

  function handleKeydown(e: KeyboardEvent, id: string) {
    if (e.key === "Enter") onRowClick(id);
  }

  function handleInputKeydown(e: KeyboardEvent, id: string, inputEl: HTMLInputElement) {
    if (e.key === "Enter") {
      onRename?.(id, inputEl.value);
    } else if (e.key === "Escape") {
      onCancelRename?.();
    }
  }

  function focus(el: HTMLInputElement) {
    el.focus();
    el.select();
  }
</script>

<div bind:this={outerEl} class="vm-tree-virtual-outer" onscroll={onScroll}>
  <div class="vm-tree-virtual-inner" style="--vm-tree-total-h: {totalH}px">
    {#each visibleSlice as flat, i (flat.node.id)}
      {@const absIdx = win.startIndex + i}
      {@const node = flat.node}
      {@const isActive = activeFilterIds?.has(node.id) ?? false}
      {@const isWarning = warningIds?.has(node.id) ?? false}
      {@const isEditing = editingId === node.id}
      {@const isHighlighted = searchHighlightIds?.has(node.id) ?? false}

      <div
        class="vm-tree-virtual-row {node.cls ?? ''}"
        class:is-active-filter={isActive}
        class:vm-badge-warning={isWarning}
        class:vm-search-highlight={isHighlighted}
        class:is-editing={isEditing}
        style="--vm-tree-y: {absIdx * rowH}px; --depth: {flat.depth}"
        data-id={node.id}
        onclick={() => onRowClick(node.id)}
        oncontextmenu={(e) => onContextMenu(node.id, e)}
        onkeydown={(e) => handleKeydown(e, node.id)}
        role="treeitem"
        aria-selected={isActive}
        tabindex="0"
        aria-expanded={flat.hasChildren ? flat.isExpanded : undefined}
      >
        <!-- Chevron / Spacer -->
        <div
          class="vm-tree-toggle"
          onclick={(e) => { e.stopPropagation(); if (flat.hasChildren) onToggle(node.id); }}
          onkeydown={() => {}}
          role="button"
          tabindex="-1"
        >
          {#if flat.hasChildren}
            <span use:icon={flat.isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}></span>
          {/if}
        </div>

        <!-- Icon -->
        {#if node.icon}
          <span class="vm-tree-icon" use:icon={node.icon}></span>
        {/if}

        <!-- Label / Input -->
        {#if isEditing}
          <input
            class="vm-tree-input"
            value={node.label}
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => handleInputKeydown(e, node.id, e.currentTarget)}
            onblur={() => onCancelRename?.()}
            use:focus
          />
        {:else}
          <span class="vm-tree-label">{node.label}</span>
        {/if}

        <!-- Badges / Counts -->
        {#if (node.count != null && node.count > 0) || (node.badges && node.badges.length > 0)}
          <div class="vm-tree-badge-zone">
            {#if node.badges}
              {#each node.badges as badge}
                <div
                  class="vm-badge"
                  role="button"
                  tabindex="-1"
                  class:is-solid={badge.solid}
                  class:is-inherited={badge.isInherited}
                  class:is-undoable={badge.queueIndex !== undefined}
                  class:vm-badge--red={badge.solid && badge.color === 'red'}
                  class:vm-badge--blue={badge.solid && badge.color === 'blue'}
                  class:vm-badge--purple={badge.solid && badge.color === 'purple'}
                  class:vm-badge--orange={badge.solid && badge.color === 'orange'}
                  class:vm-badge--green={badge.solid && badge.color === 'green'}
                  title={badge.queueIndex !== undefined ? `${badge.text ?? ''} — double-click to undo` : (badge.text ?? '')}
                  ondblclick={(e) => {
                    if (badge.queueIndex !== undefined) {
                      e.stopPropagation();
                      onBadgeDoubleClick?.(badge.queueIndex);
                    }
                  }}
                >
                  {#if badge.icon}
                    <span class="vm-badge-icon" use:icon={badge.icon}></span>
                  {/if}
                </div>
              {/each}
            {/if}

            {#if node.count != null && node.count > 0}
              <span class="vm-tree-count">{node.count}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

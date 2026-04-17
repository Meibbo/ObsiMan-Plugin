<script lang="ts">
  import type { TreeNode } from "../../types/typeTree";
  import { translate } from "../../i18n/index";
  import ViewTree from "./viewTree.svelte";

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
    renderLimit?: number;
    depth?: number;
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
    renderLimit = 200,
    depth = 0
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent, id: string) {
    if (e.key === "Enter") {
      onRowClick(id);
    }
  }

  function handleInputKeydown(e: KeyboardEvent, id: string, inputEl: HTMLInputElement) {
    if (e.key === "Enter") {
      onRename?.(id, inputEl.value);
    } else if (e.key === "Escape") {
      onCancelRename?.();
    }
  }

  // Count globally to respect renderLimit even in recursive calls
  // However, for Simplicity in Svelte 5 and given typical Vaultman tree sizes, 
  // we'll slice the top level and pass down the remaining limit.
  function focus(el: HTMLInputElement) {
    el.focus();
    el.select();
  }
</script>

{#each nodes.slice(0, renderLimit) as node (node.id)}
  {@const hasChildren = (node.children?.length ?? 0) > 0}
  {@const isExpanded = expandedIds.has(node.id)}
  {@const isActive = activeFilterIds?.has(node.id) ?? false}
  {@const isWarning = warningIds?.has(node.id) ?? false}
  {@const isEditing = editingId === node.id}
  {@const isHighlighted = searchHighlightIds?.has(node.id) ?? false}

  <div
    class="vaultman-tree-row {node.cls ?? ''}"
    class:is-active-filter={isActive}
    class:vaultman-badge-warning={isWarning}
    class:vaultman-search-highlight={isHighlighted}
    class:is-editing={isEditing}
    style="--depth: {node.depth}"
    onclick={() => onRowClick(node.id)}
    oncontextmenu={(e) => onContextMenu(node.id, e)}
    onkeydown={(e) => handleKeydown(e, node.id)}
    role="treeitem"
    aria-selected={isActive}
    tabindex="0"
    aria-expanded={hasChildren ? isExpanded : undefined}
  >
    <!-- Chevron / Spacer -->
    <div 
      class="vaultman-tree-toggle" 
      onclick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
      onkeydown={() => {}}
      role="button"
      tabindex="-1"
    >
      {#if hasChildren}
        <span use:icon={isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}></span>
      {/if}
    </div>

    <!-- Icon -->
    {#if node.icon}
      <span class="vaultman-tree-icon" use:icon={node.icon}></span>
    {/if}

    <!-- Label / Input -->
    {#if isEditing}
      <input
        class="vaultman-tree-input"
        value={node.label}
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => handleInputKeydown(e, node.id, e.currentTarget)}
        onblur={() => onCancelRename?.()}
        use:focus
      />
    {:else}
      <span class="vaultman-tree-label">{node.label}</span>
    {/if}

    <!-- Badges / Counts -->
    {#if (node.count != null && node.count > 0) || (node.badges && node.badges.length > 0)}
      <div class="vaultman-tree-badge-zone">
        {#if node.badges}
          {#each node.badges as badge}
            <div 
              class="vaultman-badge"
              role="button"
              tabindex="-1"
              class:is-solid={badge.solid}
              class:is-inherited={badge.isInherited}
              class:is-undoable={badge.queueIndex !== undefined}
              class:vaultman-badge--red={badge.solid && badge.color === 'red'}
              class:vaultman-badge--blue={badge.solid && badge.color === 'blue'}
              class:vaultman-badge--purple={badge.solid && badge.color === 'purple'}
              class:vaultman-badge--orange={badge.solid && badge.color === 'orange'}
              class:vaultman-badge--green={badge.solid && badge.color === 'green'}
              title={badge.queueIndex !== undefined ? `${badge.text ?? ''} — double-click to undo` : (badge.text ?? '')}
              ondblclick={(e) => {
                if (badge.queueIndex !== undefined) {
                  e.stopPropagation();
                  onBadgeDoubleClick?.(badge.queueIndex);
                }
              }}
            >
              {#if badge.icon}
                <span class="vaultman-badge-icon" use:icon={badge.icon}></span>
              {/if}
            </div>
          {/each}
        {/if}

        {#if node.count != null && node.count > 0}
          <span class="vaultman-tree-count">{node.count}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if hasChildren && isExpanded && node.children}
    <div class="vaultman-tree-children">
      <ViewTree
        nodes={node.children}
        {expandedIds}
        {onToggle}
        {onRowClick}
        {onContextMenu}
        {activeFilterIds}
        {searchHighlightIds}
        {warningIds}
        {editingId}
        {onRename}
        {onCancelRename}
        {onBadgeDoubleClick}
        {icon}
        renderLimit={renderLimit}
        depth={depth + 1}
      />
    </div>
  {/if}
{/each}

{#if nodes.length > renderLimit}
  <button 
    class="vaultman-btn-small vaultman-show-more" 
    onclick={() => renderLimit = Infinity}
  >
    {translate("common.showAll", { count: nodes.length })}
  </button>
{/if}

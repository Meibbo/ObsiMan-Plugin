<script lang="ts">
  import { setIcon } from 'obsidian';
  import type { ObsiManPlugin } from '../../main';

  let { plugin }: { plugin: ObsiManPlugin } = $props();

  type Scope = 'vault' | 'filtered' | 'selected';
  let scope = $state<Scope>('vault');

  const app = plugin.app;

  let counts = $derived({
    folders: app.vault.getAllFolders(true).length,
    files: scope === 'vault'
      ? app.vault.getMarkdownFiles().length
      : scope === 'filtered'
        ? plugin.filterService.filteredFiles.length
        : plugin.filterService.selectedFiles.length,
    props: plugin.propertyIndex.index.size,
    values: [...plugin.propertyIndex.index.values()].reduce((n, s) => n + s.size, 0),
    tags: Object.keys((app.metadataCache as unknown as { getTags(): Record<string, number> }).getTags() ?? {}).length,
  });

  const statCards = $derived([
    { label: 'Folders', icon: 'lucide-folder',    value: counts.folders },
    { label: 'Files',   icon: 'lucide-file-text', value: counts.files   },
    { label: 'Props',   icon: 'lucide-tag',        value: counts.props   },
    { label: 'Values',  icon: 'lucide-list',       value: counts.values  },
    { label: 'Tags',    icon: 'lucide-hash',       value: counts.tags    },
  ]);

  const scopeOptions: { id: Scope; label: string }[] = [
    { id: 'vault',    label: 'In vault'  },
    { id: 'filtered', label: 'Filtered'  },
    { id: 'selected', label: 'Selected'  },
  ];

  function iconAction(el: HTMLElement, name: string) {
    setIcon(el, name);
    return {
      update(newName: string) { setIcon(el, newName); },
    };
  }
</script>

<div class="obsiman-statistics-page">
  <!-- Vault name heading -->
  <div class="obsiman-statistics-vault-name">
    {app.vault.getName()}
  </div>

  <!-- Stat cards -->
  <div class="obsiman-stat-cards-grid">
    {#each statCards as card}
      <div class="obsiman-stat-card">
        <span class="obsiman-stat-card-icon" use:iconAction={card.icon}></span>
        <span class="obsiman-stat-card-value">{card.value}</span>
        <span class="obsiman-stat-card-label">{card.label}</span>
      </div>
    {/each}
  </div>

  <!-- Scope pills -->
  <div class="obsiman-stat-scope-pills">
    {#each scopeOptions as opt}
      <button
        class="obsiman-stat-scope-pill"
        class:is-active={scope === opt.id}
        onclick={() => scope = opt.id}
      >
        {opt.label}
      </button>
    {/each}
  </div>

  <!-- Meta stats (Iter.15) -->
  <div class="obsiman-stat-meta">
    <span class="obsiman-stat-meta-item">Total links <strong>—</strong></span>
    <span class="obsiman-stat-meta-item">Word count <strong>—</strong></span>
  </div>
</div>

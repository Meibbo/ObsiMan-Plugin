<script lang="ts">
	import { Component as ObsidianComponent, MarkdownRenderer, setIcon, type TFile } from 'obsidian';
	import { onDestroy, untrack } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import { translate } from '../../index/i18n/lang';

	let {
		plugin,
		previewFile = null,
		onShowStats,
	}: {
		plugin: VaultmanPlugin;
		previewFile?: TFile | null;
		onShowStats?: () => void;
	} = $props();

	type Scope = 'vault' | 'filtered' | 'selected';
	let scope = $state<Scope>('vault');

	let metaStats = $state({ links: 0, words: 0, loading: false });
	let previewHost = $state<HTMLElement>();
	let previewError = $state<string | null>(null);
	let noteRenderComponent: ObsidianComponent | null = null;
	let renderSerial = 0;

	$effect(() => {
		const files =
			scope === 'vault'
				? plugin.app.vault.getMarkdownFiles()
				: scope === 'filtered'
					? plugin.filterService.filteredFiles
					: plugin.filterService.selectedFiles;

		// Reset and show loading if needed
		metaStats.loading = true;
		let totalLinks = 0;
		let totalWords = 0;

		// Use a small timeout to avoid blocking the main thread immediately if there are many files
		const compute = async () => {
			for (const file of files) {
				const cache = plugin.app.metadataCache.getFileCache(file);
				totalLinks += (cache?.links?.length ?? 0) + (cache?.embeds?.length ?? 0);
				// Word count is heavy, so we limit it to filtered/selected for now
				if (files.length < 5000) {
					// Approximate word count from cache if available or just skip for now
					// plugin.app.metadataCache doesn't have word count, would need vault.read
				}
			}
			metaStats.links = totalLinks;
			metaStats.words = totalWords; // Word count requires reading content, deferred for efficiency
			metaStats.loading = false;
		};
		void compute();
	});

	let counts = $derived.by(() => ({
		folders: plugin.app.vault.getAllFolders(true).length,
		files:
			scope === 'vault'
				? plugin.app.vault.getMarkdownFiles().length
				: scope === 'filtered'
					? plugin.filterService.filteredFiles.length
					: plugin.filterService.selectedFiles.length,
		props: plugin.propertyIndex.index.size,
		values: [...plugin.propertyIndex.index.values()].reduce((n, s) => n + s.size, 0),
		tags: Object.keys(
			(
				plugin.app.metadataCache as unknown as {
					getTags?: () => Record<string, number>;
				}
			).getTags?.() ?? {},
		).length,
	}));

	const statCards = $derived([
		{
			label: translate('stats.folders'),
			icon: 'lucide-folder',
			value: counts.folders,
			color: 'var(--color-blue)',
		},
		{
			label: translate('stats.files'),
			icon: 'lucide-file-text',
			value: counts.files,
			color: 'var(--color-green)',
		},
		{
			label: translate('stats.props'),
			icon: 'lucide-tag',
			value: counts.props,
			color: 'var(--color-orange)',
		},
		{
			label: translate('stats.values'),
			icon: 'lucide-list',
			value: counts.values,
			color: 'var(--color-purple)',
		},
		{
			label: translate('stats.tags'),
			icon: 'lucide-hash',
			value: counts.tags,
			color: 'var(--color-red)',
		},
	]);

	const scopeOptions: { id: Scope; label: string; icon: string }[] = [
		{ id: 'vault', label: translate('scope.all'), icon: 'lucide-database' },
		{
			id: 'filtered',
			label: translate('scope.filtered'),
			icon: 'lucide-filter',
		},
		{
			id: 'selected',
			label: translate('scope.selected'),
			icon: 'lucide-check-square',
		},
	];

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	$effect(() => {
		const file = previewFile;
		const host = previewHost;
		if (!file || !host) {
			untrack(unloadNotePreview);
			return;
		}
		const serial = ++renderSerial;
		void untrack(() => renderNotePreview(file, host, serial));
	});

	onDestroy(() => {
		unloadNotePreview();
	});

	async function renderNotePreview(file: TFile, host: HTMLElement, serial: number): Promise<void> {
		disposeNoteRenderComponent();
		previewError = null;
		const component = new ObsidianComponent();
		component.load();
		noteRenderComponent = component;
		host.replaceChildren();
		try {
			const markdown = await plugin.app.vault.cachedRead(file);
			if (serial !== renderSerial || previewFile !== file || noteRenderComponent !== component) {
				component.unload();
				return;
			}
			await MarkdownRenderer.render(plugin.app, markdown, host, file.path, component);
		} catch (error) {
			if (noteRenderComponent === component) {
				previewError = error instanceof Error ? error.message : String(error);
			}
		}
	}

	function unloadNotePreview(): void {
		renderSerial += 1;
		disposeNoteRenderComponent();
	}

	function disposeNoteRenderComponent(): void {
		if (!noteRenderComponent) return;
		noteRenderComponent.unload();
		noteRenderComponent = null;
	}
</script>

<div class="vm-statistics-page">
	{#if previewFile}
		<div class="vm-stat-note-preview">
			<div class="vm-stat-note-preview-header">
				<div class="vm-stat-note-preview-title">
					<span class="vm-meta-icon" use:iconAction={'lucide-file-text'}></span>
					<span>{previewFile.basename}</span>
				</div>
				<button class="vm-stat-note-preview-return" onclick={() => onShowStats?.()}>
					<span use:iconAction={'lucide-bar-chart-2'}></span>
					<span>{translate('stats.show_pagestats')}</span>
				</button>
			</div>
			{#if previewError}
				<div class="vm-stat-note-preview-error">{previewError}</div>
			{/if}
			<div class="vm-stat-note-preview-body markdown-rendered" bind:this={previewHost}></div>
		</div>
	{:else}
		<div class="vm-stat-header">
			<div class="vm-stat-scope-pills">
				{#each scopeOptions as opt (opt.id)}
					<button
						class="vm-stat-scope-pill"
						class:is-active={scope === opt.id}
						onclick={() => (scope = opt.id)}
						aria-label={opt.label}
					>
						<span class="vm-pill-icon" use:iconAction={opt.icon}></span>
						<span class="vm-pill-label">{opt.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="vm-stat-cards-grid">
			{#each statCards as card (card.label)}
				<div class="vm-stat-card" style="--card-color: {card.color}">
					<div class="vm-stat-card-icon" use:iconAction={card.icon}></div>
					<div class="vm-stat-card-info">
						<span class="vm-stat-card-value">{card.value.toLocaleString()}</span>
						<span class="vm-stat-card-label">{card.label}</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="vm-stat-meta-island">
			<div class="vm-stat-meta-item">
				<span class="vm-meta-icon" use:iconAction={'lucide-link'}></span>
				<span class="vm-meta-label">{translate('stats.total_links')}</span>
				<span class="vm-meta-value">{metaStats.links.toLocaleString()}</span>
			</div>
			<div class="vm-stat-meta-item">
				<span class="vm-meta-icon" use:iconAction={'lucide-type'}></span>
				<span class="vm-meta-label">{translate('stats.word_count')}</span>
				<span class="vm-meta-value"
					>{metaStats.words > 0 ? metaStats.words.toLocaleString() : '—'}</span
				>
			</div>
		</div>
	{/if}
</div>

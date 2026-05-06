<script lang="ts">
	import { untrack } from 'svelte';
	import type { TFile } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import type { ExplorerViewMode } from '../../types/typeExplorer';
	import type { FnRScope, FnRState } from '../../types/typeFnR';
	import { buildContentReplaceChange, createFnRState } from '../../services/serviceFnR.svelte';
	import { translate } from '../../index/i18n/lang';
	import { SEARCH_SEMANTICS_SOURCES } from '../frame/frameSearchSources';
	import PanelExplorer from '../containers/panelExplorer.svelte';
	import { explorerContent } from '../containers/explorerContent';

	let {
		plugin,
		query = '',
		onQueryChange,
		fnrState = $bindable(createFnRState()),
		selectedFilePaths = new Set<string>(),
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		viewMode = $bindable('tree'),
		icon = defaultIcon,
	}: {
		plugin: VaultmanPlugin;
		query?: string;
		onQueryChange?: (term: string) => void;
		fnrState?: FnRState;
		selectedFilePaths?: Set<string>;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		viewMode?: ExplorerViewMode;
		icon?: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	const contentExplorer = $derived(new explorerContent(plugin));
	let contentVersion = $state(0);
	let helpOpen = $state(false);

	const scopeFiles = $derived.by(() => resolveFnRScopeFiles(fnrState.scope));
	const scopeLabel = $derived(
		translate('fnr.scope_label', {
			count: scopeFiles.length,
			scope: translate(`fnr.scope.${fnrState.scope}`),
		}),
	);
	const canQueueReplace = $derived(query.trim().length > 0 && scopeFiles.length > 0);

	$effect(() => {
		contentExplorer.setSearchTerm(query);
	});

	$effect(() => {
		const bumpContentVersion = () => {
			contentVersion = untrack(() => contentVersion + 1);
		};
		bumpContentVersion();
		return plugin.contentIndex.subscribe(bumpContentVersion);
	});

	function defaultIcon(_node: HTMLElement, _name: string) {
		return {
			update() {},
		};
	}

	function updateQuery(term: string): void {
		query = term;
		onQueryChange?.(term);
		contentExplorer.setSearchTerm(term);
	}

	function updateFnRState(patch: Partial<FnRState>): void {
		fnrState = { ...fnrState, syntax: 'plain', ...patch };
	}

	function updateScope(scope: FnRScope): void {
		updateFnRState({ scope });
	}

	function queueReplace(): void {
		const change = buildContentReplaceChange({
			find: query,
			files: scopeFiles,
			state: { ...fnrState, syntax: 'plain' },
		});
		if (!change) return;
		plugin.queueService.add(change);
	}

	function resolveFnRScopeFiles(scope: FnRScope): TFile[] {
		if (scope === 'all') return plugin.app?.vault.getMarkdownFiles() ?? [];
		if (scope === 'selected') {
			const fromPaths = [...selectedFilePaths]
				.map((path) => plugin.app?.vault.getFileByPath(path) ?? null)
				.filter((file): file is TFile => Boolean(file));
			if (fromPaths.length > 0) return fromPaths;
			return [...(plugin.filterService?.selectedFiles ?? [])];
		}
		return [...(plugin.filterService?.filteredFiles ?? [])];
	}
</script>

<div class="vm-content-tab">
	<div class="vm-content-fnr" aria-label={translate('fnr.advanced')}>
		<div class="vm-content-fnr-row">
			<input
				class="vm-content-fnr-input vm-content-find"
				type="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				aria-label={translate('content.find_placeholder')}
				placeholder={translate('content.find_placeholder')}
				value={query}
				oninput={(e) => updateQuery((e.currentTarget as HTMLInputElement).value)}
			/>
			<button
				class="vm-content-fnr-icon"
				aria-label={translate('filter.search_help')}
				title={translate('filter.search_help')}
				use:icon={'lucide-circle-help'}
				onclick={() => {
					helpOpen = !helpOpen;
				}}
			></button>
			{#if helpOpen}
				<div class="vm-content-fnr-help" aria-label={translate('filter.search_read_more')}>
					{#each SEARCH_SEMANTICS_SOURCES as source (source.id)}
						<a class="vm-content-fnr-help-link" href={source.href} target="_blank" rel="noreferrer">
							{source.label}
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<div class="vm-content-fnr-row">
			<input
				class="vm-content-fnr-input"
				type="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				aria-label={translate('content.replace_placeholder')}
				placeholder={translate('content.replace_placeholder')}
				value={fnrState.replace}
				oninput={(e) =>
					updateFnRState({ replace: (e.currentTarget as HTMLInputElement).value })}
			/>
		</div>

		<div class="vm-content-fnr-row vm-content-fnr-options">
			<label class="vm-content-fnr-toggle">
				<input
					type="checkbox"
					checked={fnrState.caseSensitive}
					onchange={(e) =>
						updateFnRState({
							caseSensitive: (e.currentTarget as HTMLInputElement).checked,
						})}
				/>
				<span>{translate('fnr.case_sensitive')}</span>
			</label>
			<label class="vm-content-fnr-toggle">
				<input
					type="checkbox"
					checked={fnrState.wholeWord}
					onchange={(e) =>
						updateFnRState({
							wholeWord: (e.currentTarget as HTMLInputElement).checked,
						})}
				/>
				<span>{translate('fnr.whole_word')}</span>
			</label>
		</div>

		<div class="vm-content-fnr-row vm-content-fnr-footer">
			<div class="vm-content-fnr-scope" aria-label={translate('fnr.scope')}>
				{#each ['filtered', 'selected', 'all'] as scope (scope)}
					<button
						class="vm-content-fnr-scope-pill"
						class:is-active={fnrState.scope === scope}
						type="button"
						onclick={() => updateScope(scope as FnRScope)}
					>
						{translate(`fnr.scope.${scope}`)}
					</button>
				{/each}
			</div>
			<span class="vm-content-fnr-scope-label">{scopeLabel}</span>
			<button
				class="vm-content-fnr-queue"
				type="button"
				disabled={!canQueueReplace}
				onclick={queueReplace}
			>
				{translate('content.queue_replace')}
			</button>
		</div>
	</div>

	{#if query.trim().length > 0}
		{#key `${query}:${contentVersion}`}
			<PanelExplorer
				{plugin}
				provider={contentExplorer}
				searchTerm={query}
				searchMode={0}
				bind:sortBy
				bind:sortDirection
				bind:viewMode
				{icon}
			/>
		{/key}
	{:else}
		<div class="vm-content-empty">{translate('content.search.hint')}</div>
	{/if}
</div>

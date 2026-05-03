<script lang="ts">
	import type { iVaultmanPlugin } from '../../types/typeSettings';
	import { translate } from '../../i18n/index';
	import Toggle from '../primitives/Toggle.svelte';
	import Dropdown from '../primitives/Dropdown.svelte';
	import TextInput from '../primitives/TextInput.svelte';

	let { plugin }: { plugin: iVaultmanPlugin } = $props();

	function initState() {
		const src = plugin.settings;
		return {
			layoutTheme: src.layoutTheme,
			islandDismissOnOutsideClick: src.islandDismissOnOutsideClick,
			islandBackdropBlur: src.islandBackdropBlur,
			glassBlurIntensity: src.glassBlurIntensity,
			defaultPropertyType: src.defaultPropertyType,
			filterTemplates: src.filterTemplates,
			sessionFilePath: src.sessionFilePath,
			explorerCtrlClickSearch: src.explorerCtrlClickSearch,
			explorerShowQueuePreview: src.explorerShowQueuePreview,
			explorerContentSearch: src.explorerContentSearch,
			explorerOperationScope: src.explorerOperationScope,
			operationsPanelPosition: src.operationsPanelPosition,
			basesLastUsedPath: src.basesLastUsedPath,
			basesOpenMode: src.basesOpenMode,
			basesOpsPanelSide: src.basesOpsPanelSide,
			basesExplorerSide: src.basesExplorerSide,
			basesAutoAttach: src.basesAutoAttach,
			basesInjectCheckboxes: src.basesInjectCheckboxes,
			basesShowColumnSeparators: src.basesShowColumnSeparators,
			openMode: src.openMode,
			pageOrder: [...src.pageOrder],
			separatePanes: src.separatePanes,
			viewMode: src.viewMode,
			filtersShowTabLabels: src.filtersShowTabLabels,
			filtersTabLabelsMigrated: src.filtersTabLabelsMigrated,
			gridRenderMode: (src.gridRenderMode ?? 'plain') as 'plain' | 'chunk' | 'all',
			gridEditableColumns: [...(src.gridEditableColumns ?? [])],
			gridLivePreviewColumns: [...(src.gridLivePreviewColumns ?? [])],
			gridColumns: [...(src.gridColumns ?? [])],
			gridRenderChunkSize: src.gridRenderChunkSize ?? 50,
			contextMenuShowInFileMenu: src.contextMenuShowInFileMenu,
			contextMenuShowInEditorMenu: src.contextMenuShowInEditorMenu,
			contextMenuShowInMoreOptions: src.contextMenuShowInMoreOptions,
			contextMenuHideRules: src.contextMenuHideRules,
		};
	}
	let s = $state(initState());

	function persistSettings(): void {
		Object.assign(plugin.settings, $state.snapshot(s));
		void plugin.saveSettings();
		plugin.updateGlassBlur();
	}

	$effect(() => {
		activeDocument.body.toggleClass('vm-bases-column-separators', s.basesShowColumnSeparators);
	});

	function arrToStr(arr: string[]): string {
		return arr.join(', ');
	}
	function strToArr(str: string): string[] {
		return str
			.split(',')
			.map((x) => x.trim())
			.filter(Boolean);
	}

	const PAGE_IDS = ['ops', 'statistics', 'filters'] as const;
	const PAGE_LABELS: Record<string, string> = {
		ops: translate('nav.ops'),
		statistics: translate('nav.statistics'),
		filters: translate('nav.filters'),
	};

	function setPageOrder(pos: number, value: string): void {
		const order = [...s.pageOrder];
		order[pos] = value;
		s.pageOrder = order;
		persistSettings();
	}
</script>

<div class="vm-settings">
	<!-- ── General ─────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.default_type')}</h3>

	<Dropdown
		label={translate('settings.default_type')}
		bind:value={s.defaultPropertyType}
		onChange={persistSettings}
		options={[
			{ value: 'text', label: translate('prop.type.text') },
			{ value: 'number', label: translate('prop.type.number') },
			{ value: 'checkbox', label: translate('prop.type.checkbox') },
			{ value: 'list', label: translate('prop.type.list') },
			{ value: 'date', label: translate('prop.type.date') },
		]}
	/>

	<TextInput
		label="Session file path"
		placeholder="vaultman/session.md"
		value={s.sessionFilePath}
		onInput={(v) => {
			s.sessionFilePath = v;
			persistSettings();
		}}
	/>

	<!-- ── Explorer ──────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Explorer</h3>

	<Toggle
		bind:checked={s.explorerCtrlClickSearch}
		label={translate('settings.ctrl_click_search')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerShowQueuePreview}
		label={translate('settings.queue_preview')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.explorerContentSearch}
		label={translate('settings.content_search')}
		onChange={persistSettings}
	/>

	<Dropdown
		label={translate('settings.operation_scope')}
		bind:value={s.explorerOperationScope}
		onChange={persistSettings}
		options={[
			{ value: 'auto', label: translate('settings.scope.auto') },
			{ value: 'selected', label: translate('settings.scope.selected') },
			{ value: 'filtered', label: translate('settings.scope.filtered') },
			{ value: 'all', label: translate('settings.scope.all') },
		]}
	/>

	<!-- ── View ──────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.view_section')}</h3>

	<Dropdown
		label={translate('settings.open_mode')}
		bind:value={s.openMode}
		onChange={persistSettings}
		options={[
			{ value: 'sidebar', label: translate('settings.open_mode.sidebar') },
			{ value: 'main', label: translate('settings.open_mode.main') },
			{ value: 'both', label: translate('settings.open_mode.both') },
		]}
	/>

	<Dropdown
		label={translate('settings.ops_position')}
		bind:value={s.operationsPanelPosition}
		onChange={persistSettings}
		options={[
			{ value: 'right', label: translate('settings.ops_position.right') },
			{ value: 'bottom', label: translate('settings.ops_position.bottom') },
			{ value: 'replace', label: translate('settings.ops_position.replace') },
		]}
	/>

	<Dropdown
		label="File list view mode"
		bind:value={s.viewMode}
		onChange={persistSettings}
		options={[
			{ value: 'list', label: translate('view.mode.list') },
			{ value: 'selected', label: translate('view.mode.selected') },
		]}
	/>

	<Toggle
		bind:checked={s.separatePanes}
		label={translate('settings.layout.separate_panes')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.filtersShowTabLabels}
		label="Show tab labels in Filters"
		onChange={persistSettings}
	/>

	<div class="vm-settings-row">
		<span class="vm-settings-label">{translate('settings.page_order')}</span>
		<div class="vm-settings-page-order">
			{#each [0, 1, 2] as pos (pos)}
				<select
					value={s.pageOrder[pos]}
					onchange={(e) => setPageOrder(pos, (e.target as HTMLSelectElement).value)}
				>
					{#each PAGE_IDS as id (id)}
						<option value={id}>{PAGE_LABELS[id]}</option>
					{/each}
				</select>
			{/each}
		</div>
	</div>

	<!-- ── Appearance ────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Appearance</h3>

	<Dropdown
		label={translate('settings.layout_theme')}
		bind:value={s.layoutTheme}
		onChange={persistSettings}
		options={[
			{ value: 'native', label: translate('settings.layout_theme.native') },
			{ value: 'polish', label: translate('settings.layout_theme.polish') },
			{ value: 'glass', label: translate('settings.layout_theme.glass') },
		]}
	/>

	<Toggle
		bind:checked={s.islandDismissOnOutsideClick}
		label={translate('settings.island_dismiss_outside')}
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.islandBackdropBlur}
		label={translate('settings.island_backdrop_blur')}
		onChange={persistSettings}
	/>

	<label class="vm-settings-slider">
		<span class="vm-settings-label">Background blur intensity</span>
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			bind:value={s.glassBlurIntensity}
			oninput={persistSettings}
		/>
		<span class="vm-settings-slider-value">{s.glassBlurIntensity}</span>
	</label>

	<!-- ── Layout ────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.layout.title')}</h3>

	<!-- ── Bases ─────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Bases</h3>

	<Dropdown
		label="Open mode"
		bind:value={s.basesOpenMode}
		onChange={persistSettings}
		options={[
			{ value: 'last-used', label: 'Reopen last used' },
			{ value: 'picker', label: 'Always show picker' },
		]}
	/>
	<Dropdown
		label="Operations panel side"
		bind:value={s.basesOpsPanelSide}
		onChange={persistSettings}
		options={[
			{ value: 'left', label: 'Left' },
			{ value: 'right', label: 'Right' },
		]}
	/>
	<Dropdown
		label="Properties explorer side"
		bind:value={s.basesExplorerSide}
		onChange={persistSettings}
		options={[
			{ value: 'left', label: 'Left' },
			{ value: 'right', label: 'Right' },
		]}
	/>
	<Toggle
		bind:checked={s.basesAutoAttach}
		label="Auto-attach to .base files"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.basesInjectCheckboxes}
		label="Inject checkbox column"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.basesShowColumnSeparators}
		label="Show column separators"
		onChange={persistSettings}
	/>

	<!-- ── Grid ──────────────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Grid</h3>

	<Dropdown
		label={translate('settings.grid_render_mode')}
		bind:value={s.gridRenderMode}
		onChange={persistSettings}
		options={[
			{ value: 'plain', label: translate('settings.grid_render_mode.plain') },
			{ value: 'chunk', label: translate('settings.grid_render_mode.chunk') },
			{ value: 'all', label: translate('settings.grid_render_mode.all') },
		]}
	/>
	<TextInput
		label={translate('settings.grid_editable_columns')}
		placeholder="name, tags, status"
		value={arrToStr(s.gridEditableColumns)}
		onInput={(v) => {
			s.gridEditableColumns = strToArr(v);
			persistSettings();
		}}
	/>
	<TextInput
		label="Live preview columns"
		placeholder="content, notes"
		value={arrToStr(s.gridLivePreviewColumns)}
		onInput={(v) => {
			s.gridLivePreviewColumns = strToArr(v);
			persistSettings();
		}}
	/>
	<TextInput
		label="Visible columns"
		placeholder="name, tags, date"
		value={arrToStr(s.gridColumns)}
		onInput={(v) => {
			s.gridColumns = strToArr(v);
			persistSettings();
		}}
	/>

	<!-- ── Context menus ─────────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">Context menus</h3>

	<Toggle
		bind:checked={s.contextMenuShowInFileMenu}
		label="Show in file explorer menu"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.contextMenuShowInEditorMenu}
		label="Show in editor menu"
		onChange={persistSettings}
	/>
	<Toggle
		bind:checked={s.contextMenuShowInMoreOptions}
		label="Show in more-options menu"
		onChange={persistSettings}
	/>

	<!-- ── Filter templates ──────────────────────────────────────────── -->
	<h3 class="vm-settings-heading">{translate('settings.templates')}</h3>

	{#if s.filterTemplates.length === 0}
		<p class="vm-settings-desc">{translate('settings.templates.desc')}</p>
	{:else}
		{#each s.filterTemplates as tmpl (tmpl.name)}
			<div class="vm-settings-template-row">
				<span class="vm-settings-template-name">{tmpl.name}</span>
				<span class="vm-settings-template-count">{tmpl.root.children.length} filters</span>
				<button
					class="mod-warning"
					onclick={() => {
						s.filterTemplates = s.filterTemplates.filter((t) => t.name !== tmpl.name);
						persistSettings();
					}}
				>
					{translate('filter.template.delete')}
				</button>
			</div>
		{/each}
	{/if}
</div>

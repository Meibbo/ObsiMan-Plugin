<script lang="ts">
	import type { VaultmanPlugin } from "../../../main";
	import { translate } from "../../i18n/index";
	import { setIcon } from "obsidian";
	import { fade } from "svelte/transition";
	import FiltersTagsTab from "../tabs/FiltersTagsTab.svelte";
	import FiltersPropsTab from "../tabs/FiltersPropsTab.svelte";
	import FiltersFilesTab from "../tabs/FiltersFilesTab.svelte";
	import SortPopup from "../popups/SortPopup.svelte";
	import ViewModePopup from "../popups/ViewModePopup.svelte";
	import type { FilesExplorerPanel } from "../containers/FilesExplorerPanel";
	import type { PropsExplorerPanel } from "../containers/PropsExplorerPanel";
	import type { TagsExplorerPanel } from "../containers/TagsExplorerPanel";

	type FiltersTab = "props" | "files" | "tags";

	let {
		plugin,
		filtersActiveTab = $bindable("props"),
		filtersSearch = $bindable(""),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
		selectedCount = $bindable(0),
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<FiltersTab, number>;
		tagsExplorer: TagsExplorerPanel | null;
		propExplorer: PropsExplorerPanel | undefined;
		fileList: FilesExplorerPanel | undefined;
		selectedCount: number;
	} = $props();

	const TAB_ICONS: Record<FiltersTab, string> = {
		tags: "lucide-tag",
		props: "lucide-tag",
		files: "lucide-files",
	};

	const CATEGORY_ICONS: Record<FiltersTab, [string, string]> = {
		props: ["lucide-tag", "lucide-text-cursor-input"],
		tags: ["lucide-hash", "lucide-git-branch"],
		files: ["lucide-file", "lucide-folder"],
	};

	const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
		props: [
			translate("filter.category.props"),
			translate("filter.category.values"),
		],
		tags: [
			translate("filter.category.all_tags"),
			translate("filter.category.leaf_tags"),
		],
		files: [
			translate("filter.category.files"),
			translate("filter.category.folders"),
		],
	};

	const currentCategoryIcon = $derived(
		CATEGORY_ICONS[filtersActiveTab]?.[
			filtersSearchCategory[filtersActiveTab] ?? 0
		] ?? "lucide-search",
	);

	function switchFiltersTab(tab: FiltersTab) {
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function cycleSearchCategory() {
		const tab = filtersActiveTab;
		filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
		filtersSearchCategory = { ...filtersSearchCategory };
	}

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	// Header replacement state (Level 4 popups).
	type HeaderMode = "header" | "sort" | "viewmode";
	let headerMode    = $state<HeaderMode>("header");
	// Which direction the header exits when a popup opens:
	//   sort     → header exits RIGHT, popup enters from LEFT
	//   viewmode → header exits LEFT,  popup enters from RIGHT
	let headerExitDir = $state<"left" | "right">("right");

	function openSortPopup() {
		headerExitDir = "right";
		headerMode    = "sort";
	}

	function openViewModePopup() {
		headerExitDir = "left";
		headerMode    = "viewmode";
	}

	function closeHeaderPopup() {
		headerMode = "header";
	}
</script>

<!-- 3-tab bar: Tags · Props · Files -->
<div
	class="vaultman-tab-bar"
	class:has-labels={plugin.settings.filtersShowTabLabels}
>
	{#each ["props", "files", "tags"] as FiltersTab[] as tab}
		<div
			class="vaultman-tab nav-action-button"
			class:is-active={filtersActiveTab === tab}
			onclick={() => switchFiltersTab(tab)}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					switchFiltersTab(tab);
				}
			}}
			aria-label={translate("filter.tab." + tab)}
			role="tab"
			tabindex="0"
		>
			<span class="vaultman-tab-icon" use:icon={TAB_ICONS[tab]}></span>
			{#if plugin.settings.filtersShowTabLabels}
				<span class="vaultman-tab-label"
					>{translate("filter.tab." + tab)}</span
				>
			{/if}
		</div>
	{/each}
</div>

<!-- Header area: normal header OR Level 4 popup (horizontal wipe) -->
<div class="vaultman-filters-header-wrap">
	{#if headerMode === "header"}
		<div
			class="vaultman-filters-header"
			in:fade={{ duration: 0 }}
			out:fade={{ duration: 0 }}
		>
			<button
				class="vaultman-filters-header-btn"
				aria-label={translate("filter.viewmode_btn")}
				onclick={openViewModePopup}
				use:icon={"lucide-layout-list"}
			></button>
			<div class="vaultman-filters-header-search-pill">
				<input
					class="vaultman-filters-search-input"
					type="text"
					autocomplete="off"
					autocorrect="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder={translate("filter.search_placeholder")}
					bind:value={filtersSearch}
				/>
				{#if filtersSearch}
					<button
						class="vaultman-filters-search-clear"
						aria-label={translate("filter.search_clear")}
						use:icon={"lucide-x"}
						onclick={() => {
							filtersSearch = "";
						}}
					></button>
				{/if}
				<button
					class="vaultman-filters-search-mode"
					aria-label={CATEGORY_LABELS[filtersActiveTab]?.[
						filtersSearchCategory[filtersActiveTab] ?? 0
					] ?? translate("filter.search_mode")}
					use:icon={currentCategoryIcon}
					onclick={cycleSearchCategory}
				></button>
			</div>
			<button
				class="vaultman-filters-header-btn"
				aria-label={translate("filter.sort_btn")}
				onclick={openSortPopup}
				use:icon={"lucide-arrow-up-down"}
			></button>
		</div>
	{:else if headerMode === "sort"}
		<div
			class="vaultman-filters-popup-slot"
			class:popup-enter-from-left={headerExitDir === "right"}
			class:popup-enter-from-right={headerExitDir === "left"}
		>
			<SortPopup
				activeTab={filtersActiveTab}
				onClose={closeHeaderPopup}
				{icon}
			/>
		</div>
	{:else if headerMode === "viewmode"}
		<div
			class="vaultman-filters-popup-slot"
			class:popup-enter-from-left={headerExitDir === "right"}
			class:popup-enter-from-right={headerExitDir === "left"}
		>
			<ViewModePopup
				activeTab={filtersActiveTab}
				onClose={closeHeaderPopup}
				{icon}
			/>
		</div>
	{/if}
</div>

<!-- Tab content: fade transition on tab switch -->
{#key filtersActiveTab}
	<div
		class="vaultman-filters-tab-content"
		in:fade={{ duration: 180 }}
		out:fade={{ duration: 180 }}
	>
		{#if filtersActiveTab === "tags"}
			<FiltersTagsTab
				{plugin}
				searchTerm={filtersSearch}
				searchMode={filtersSearchCategory.tags}
				bind:tagsExplorer
			/>
		{:else if filtersActiveTab === "props"}
			<FiltersPropsTab
				{plugin}
				searchTerm={filtersSearch}
				searchMode={filtersSearchCategory.props}
				bind:propExplorer
			/>
		{:else if filtersActiveTab === "files"}
			<FiltersFilesTab
				{plugin}
				bind:fileList
				onSelectionChange={(c) => (selectedCount = c)}
			/>
		{/if}
	</div>
{/key}

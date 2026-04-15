<script lang="ts">
	import { translate } from "../../i18n/index";
	import { Notice, type TFile } from "obsidian";
	import type { VaultmanPlugin } from "../../../main";
	import type {
		OpsTab,
		OpsTabDef,
		ContentPreviewResult,
	} from "../../types/ui";
	import { FileRenameModal } from "../../modals/FileRenameModal";
	import { PropertyManagerModal } from "../../modals/PropertyManagerModal";
	import { LinterModal } from "../../modals/LinterModal";
	import { QueueListComponent } from "../QueueListComponent";
	import { MenuCuratorPanel } from "../containers/MenuCuratorPanel";
	import FileOpsTab from "../tabs/OpsFilesTab.svelte";
	import LinterTab from "../tabs/OpsLinterTab.svelte";
	import {
		type PendingChange,
		FIND_REPLACE_CONTENT,
	} from "../../types/operation";

	let {
		plugin,
		getSelectedFiles,
		openMovePopup,
		filteredCount,
		selectedCount,
		icon,
	}: {
		plugin: VaultmanPlugin;
		getSelectedFiles: () => TFile[];
		openMovePopup: () => void;
		filteredCount: number;
		selectedCount: number;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();

	// ─── Tabs definition ─────────────────────────────────────────────────────
	const opsTabs: OpsTabDef[] = [
		{
			id: "fileops",
			label: translate("ops.tabs.fileops"),
			icon: "lucide-files",
		},
		{
			id: "linter",
			label: translate("ops.tabs.linter"),
			icon: "lucide-sparkles",
		},
		{
			id: "template",
			label: translate("ops.tabs.template"),
			icon: "lucide-layout-template",
		},
		{
			id: "layout",
			label: translate("ops.tabs.layout"),
			icon: "lucide-layout",
		},
	];

	let opsTab = $state<OpsTab>("fileops");

	// ─── Modal Triggers ──────────────────────────────────────────────────────
	function openFileRename() {
		const selected = getSelectedFiles();
		const targets =
			selected.length > 0 ? selected : plugin.filterService.filteredFiles;
		new FileRenameModal(
			plugin.app,
			plugin.propertyIndex,
			targets,
			(change: PendingChange) => plugin.queueService.add(change),
		).open();
	}

	function openPropertyManager() {
		const selected = getSelectedFiles();
		const targets =
			selected.length > 0 ? selected : plugin.filterService.filteredFiles;
		new PropertyManagerModal(
			plugin.app,
			plugin.propertyIndex,
			targets,
			(change: PendingChange) => plugin.queueService.add(change),
		).open();
	}

	function openLinter() {
		const selected = getSelectedFiles();
		const targets =
			selected.length > 0 ? selected : plugin.filterService.filteredFiles;
		new LinterModal(plugin.app, plugin.propertyIndex, targets).open();
	}

	// ─── Content Find & Replace ──────────────────────────────────────────────
	let contentFind = $state("");
	let contentReplace = $state("");
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(false);
	let contentPreviewing = $state(false);
	let contentRegexError = $state("");

	const contentScopeHint = $derived.by(() => {
		if (selectedCount > 0)
			return translate("content.scope_hint_selected").replace(
				"{count}",
				String(selectedCount),
			);
		return translate("content.scope_hint_filtered").replace(
			"{count}",
			String(filteredCount),
		);
	});

	$effect(() => {
		void contentFind;
		void contentIsRegex;
		void contentCaseSensitive;
		contentPreviewResult = null;
		contentRegexError = "";
	});

	function buildContentRegex(
		pattern: string,
		isRegex: boolean,
		caseSensitive: boolean,
	): RegExp {
		const flags = "g" + (caseSensitive ? "" : "i");
		const escaped = isRegex
			? pattern
			: pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(escaped, flags);
	}

	let queueList: QueueListComponent;
	const initQueueList = (node: HTMLElement) => {
		queueList = new QueueListComponent(node, {
			onRemove: (index: number) => {
				plugin.queueService.remove(index);
			},
			selectable: true,
		});
		// Inital render
		queueList.render(plugin.queueService.queue);
		return {};
	};

	const mountCurator = (node: HTMLElement) => {
		const panel = new MenuCuratorPanel(node, plugin);
		plugin.addChild(panel);
		return {
			destroy() {
				plugin.removeChild(panel);
			},
		};
	};

	// Keep queue list rendered
	$effect(() => {
		if (queueList && plugin.queueService) {
			// This effect runs when queue changes if we access it
			queueList.render(plugin.queueService.queue);
		}
	});

	async function previewContentReplace() {
		if (!contentFind) return;
		contentPreviewing = true;
		contentPreviewResult = null;
		contentRegexError = "";

		let regex: RegExp;
		try {
			regex = buildContentRegex(
				contentFind,
				contentIsRegex,
				contentCaseSensitive,
			);
		} catch {
			contentRegexError = translate("content.invalid_regex");
			contentPreviewing = false;
			return;
		}

		const selected = getSelectedFiles();
		const targets =
			selected.length > 0
				? selected
				: [...plugin.filterService.filteredFiles];

		const MAX_FILES = 20;
		const MAX_SNIPPETS = 3;
		const CONTEXT_LEN = 50;

		let totalMatches = 0;
		let matchingFileCount = 0;
		const fileResults: ContentPreviewResult["files"] = [];

		for (const file of targets) {
			const content = await plugin.app.vault.read(file);
			regex.lastIndex = 0;
			const matches = [...content.matchAll(regex)];
			if (matches.length === 0) continue;

			matchingFileCount++;
			totalMatches += matches.length;

			if (fileResults.length < MAX_FILES) {
				const snippets = matches.slice(0, MAX_SNIPPETS).map((m) => {
					const start = m.index ?? 0;
					const end = start + m[0].length;
					return {
						before: content.slice(
							Math.max(0, start - CONTEXT_LEN),
							start,
						),
						match: m[0],
						after: content.slice(end, end + CONTEXT_LEN),
					};
				});
				fileResults.push({
					file,
					matchCount: matches.length,
					snippets,
				});
			}
		}

		contentPreviewResult = {
			totalMatches,
			files: fileResults,
			moreFiles: Math.max(0, matchingFileCount - MAX_FILES),
		};
		contentPreviewing = false;
		contentPreviewOpen = true;
	}

	function queueContentReplace() {
		if (!contentFind) return;

		const selected = getSelectedFiles();
		const targets =
			selected.length > 0
				? selected
				: [...plugin.filterService.filteredFiles];

		plugin.queueService.add({
			type: "content_replace",
			action: translate("ops.tabs.content"),
			files: targets,
			find: contentFind,
			replace: contentReplace,
			isRegex: contentIsRegex,
			caseSensitive: contentCaseSensitive,
			details: `${contentFind} → ${contentReplace}`,
			logicFunc: (_file: TFile, _metadata: Record<string, unknown>) => {
				return {
					[FIND_REPLACE_CONTENT]: {
						pattern: contentFind,
						replacement: contentReplace,
						isRegex: contentIsRegex,
						caseSensitive: contentCaseSensitive,
					},
				};
			},
			customLogic: false,
		} as any); // Cast to any to avoid PropertyChange | ContentChange | FileChange union issues in add()

		new Notice(translate("prop.add_to_queue"));
	}
</script>

<div class="vaultman-tab-bar">
	{#each opsTabs as tab}
		<div
			class="vaultman-tab nav-action-button"
			class:is-active={opsTab === tab.id}
			data-tab={tab.id}
			onclick={() => {
				opsTab = tab.id;
			}}
			role="tab"
			tabindex="0"
			aria-label={tab.label}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					opsTab = tab.id;
				}
			}}
		>
			<span class="vaultman-tab-icon" use:icon={tab.icon}></span>
			<span class="vaultman-tab-label">{tab.label}</span>
		</div>
	{/each}
</div>

<div class="vaultman-tab-area">
	<!-- File Ops tab (always in DOM so QueueListComponent persists) -->
	<div class="vaultman-tab-content" class:is-active={opsTab === "fileops"}>
		<FileOpsTab
			{plugin}
			{openFileRename}
			{openPropertyManager}
			{openMovePopup}
			{initQueueList}
			{icon}
			bind:contentFind
			bind:contentReplace
			bind:contentCaseSensitive
			bind:contentIsRegex
			bind:contentPreviewResult
			bind:contentPreviewOpen
			{contentPreviewing}
			{contentRegexError}
			{contentScopeHint}
			{previewContentReplace}
			{queueContentReplace}
		/>
	</div>

	<!-- Linter tab (always in DOM) -->
	<div class="vaultman-tab-content" class:is-active={opsTab === "linter"}>
		<LinterTab {openLinter} />
	</div>

	<!-- Template tab -->
	<div class="vaultman-tab-content" class:is-active={opsTab === "template"}>
		<div class="vaultman-coming-soon">
			{translate("ops.coming_soon")}
		</div>
	</div>

	<!-- Layout tab -->
	<div class="vaultman-tab-content" class:is-active={opsTab === "layout"}>
		<div class="vaultman-layout-curator" use:mountCurator></div>
	</div>
</div>

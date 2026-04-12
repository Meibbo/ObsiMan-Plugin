<script lang="ts">
	import type { ObsiManPlugin } from "../../../main";
	import type { ContentPreviewResult } from "../../types/ui";
	import FileOpsComponent from "../components/FileOpsComponent.svelte";
	import ContentOpsComponent from "../components/ContentOpsComponent.svelte";

	let {
		openFileRename,
		openPropertyManager,
		openMovePopup,
		icon,
		// Content find/replace props
		contentFind = $bindable(),
		contentReplace = $bindable(),
		contentCaseSensitive = $bindable(),
		contentIsRegex = $bindable(),
		contentPreviewResult = $bindable(),
		contentPreviewOpen = $bindable(),
		contentPreviewing,
		contentRegexError,
		contentScopeHint,
		previewContentReplace,
		queueContentReplace,
	}: {
		plugin: ObsiManPlugin;
		openFileRename: () => void;
		openPropertyManager: () => void;
		openMovePopup: () => void;
		initQueueList: (node: HTMLElement) => any;
		icon: (node: HTMLElement, name: string) => any;
		contentFind: string;
		contentReplace: string;
		contentCaseSensitive: boolean;
		contentIsRegex: boolean;
		contentPreviewResult: ContentPreviewResult | null;
		contentPreviewOpen: boolean;
		contentPreviewing: boolean;
		contentRegexError: string;
		contentScopeHint: string;
		previewContentReplace: () => Promise<void>;
		queueContentReplace: () => void;
	} = $props();
</script>

<div class="obsiman-ops-files-tab">
	<!-- File Management Component -->
	<FileOpsComponent
		{openFileRename}
		{openPropertyManager}
		{openMovePopup}
		{icon}
	/>

	<div class="obsiman-ops-separator"></div>

	<!-- Content Operations Component -->
	<ContentOpsComponent
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

	<div class="obsiman-ops-separator"></div>
</div>

<style>
	.obsiman-ops-files-tab {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.obsiman-ops-separator {
		height: 1px;
		background: var(--obsiman-border);
		margin: 4px 0;
		opacity: 0.5;
	}
</style>

<script lang="ts">
	import { translate } from "../../i18n/index";
	import type { TFile } from "obsidian";

	let {
		moveTargetFiles,
		moveTargetFolder = $bindable(),
		movePreviews,
		attachFolderSuggest,
		queueMoves,
		closePopup,
		icon,
	}: {
		moveTargetFiles: TFile[];
		moveTargetFolder: string;
		movePreviews: { oldPath: string; newPath: string }[];
		attachFolderSuggest: (node: HTMLElement) => any;
		queueMoves: () => void;
		closePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div>
	<div class="vm-popup-header">
		<span class="vm-popup-title"
			>{translate("move.title")} ({moveTargetFiles.length})</span
		>
		<div
			class="clickable-icon"
			aria-label="Close"
			use:icon={"lucide-x"}
			onclick={closePopup}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") closePopup();
			}}
			role="button"
			tabindex="0"
		></div>
	</div>
	<input
		class="vm-search-input"
		type="text"
		placeholder={translate("move.target_folder_placeholder")}
		use:attachFolderSuggest
		oninput={(e: Event) => {
			moveTargetFolder = (e.target as HTMLInputElement).value.trim();
		}}
	/>
	<p
		class="vm-text-faint"
		style="font-size: var(--font-ui-smaller); margin: 4px 0 8px;"
	>
		{translate("move.root_hint")}
	</p>
	<div class="vm-rename-preview">
		{#each movePreviews as row}
			<div class="vm-rename-row">
				<span class="vm-diff-deleted">{row.oldPath}</span>
				<span> → </span>
				<span class="vm-diff-added">{row.newPath}</span>
			</div>
		{/each}
		{#if moveTargetFiles.length > movePreviews.length}
			<div class="vm-text-faint">
				... and {moveTargetFiles.length - movePreviews.length} more
			</div>
		{/if}
	</div>
	<div class="vm-popup-actions">
		<button class="vm-btn mod-cta" onclick={queueMoves}
			>{translate("prop.add_to_queue")}</button
		>
		<button class="vm-btn" onclick={closePopup}>Cancel</button>
	</div>
</div>

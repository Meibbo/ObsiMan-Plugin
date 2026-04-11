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
	<div class="obsiman-popup-header">
		<span class="obsiman-popup-title"
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
		class="obsiman-search-input"
		type="text"
		placeholder={translate("move.target_folder_placeholder")}
		use:attachFolderSuggest
		oninput={(e: Event) => {
			moveTargetFolder = (e.target as HTMLInputElement).value.trim();
		}}
	/>
	<p
		class="obsiman-text-faint"
		style="font-size: var(--font-ui-smaller); margin: 4px 0 8px;"
	>
		{translate("move.root_hint")}
	</p>
	<div class="obsiman-rename-preview">
		{#each movePreviews as row}
			<div class="obsiman-rename-row">
				<span class="obsiman-diff-deleted">{row.oldPath}</span>
				<span> → </span>
				<span class="obsiman-diff-added">{row.newPath}</span>
			</div>
		{/each}
		{#if moveTargetFiles.length > movePreviews.length}
			<div class="obsiman-text-faint">
				... and {moveTargetFiles.length - movePreviews.length} more
			</div>
		{/if}
	</div>
	<div class="obsiman-popup-actions">
		<button class="obsiman-btn mod-cta" onclick={queueMoves}
			>{translate("prop.add_to_queue")}</button
		>
		<button class="obsiman-btn" onclick={closePopup}>Cancel</button>
	</div>
</div>

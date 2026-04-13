<script lang="ts">
	import { translate } from "../../i18n/index";

	let {
		searchName = $bindable(),
		searchFolder = $bindable(),
		closePopup,
		icon,
	}: {
		searchName: string;
		searchFolder: string;
		closePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div>
	<div class="obsiman-popup-header">
		<span class="obsiman-popup-title">{translate("nav.search_files")}</span>
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
	<div class="obsiman-search-fields">
		<input
			class="obsiman-search-input"
			type="text"
			placeholder={translate("search.name_placeholder")}
			bind:value={searchName}
		/>
		<input
			class="obsiman-search-input"
			type="text"
			placeholder={translate("search.folder_placeholder")}
			bind:value={searchFolder}
		/>
	</div>
</div>

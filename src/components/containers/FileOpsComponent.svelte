<script lang="ts">
	import { translate } from "../../i18n/index";

	let {
		openFileRename,
		openPropertyManager,
		openMovePopup,
		icon,
	}: {
		openFileRename: () => void;
		openPropertyManager: () => void;
		openMovePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div class="obsiman-ops-section">
	<div class="obsiman-ops-buttons">
		<button class="obsiman-btn" onclick={openFileRename}>
			<span class="obsiman-btn-icon" use:icon={"lucide-pencil"}></span>
			{translate("ops.rename")}
		</button>
		<button class="obsiman-btn" onclick={openPropertyManager}>
			<span class="obsiman-btn-icon" use:icon={"lucide-plus"}></span>
			{translate("ops.add_property")}
		</button>
		<button class="obsiman-btn" onclick={openMovePopup}>
			<span class="obsiman-btn-icon" use:icon={"lucide-folder-input"}
			></span>
			{translate("ops.move")}
		</button>
	</div>
</div>

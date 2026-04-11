<script lang="ts">
	import { translate } from "../../i18n/index";
	import type { ObsiManPlugin } from "../../../main";
	import { QueueDetailsModal } from "../../modals/QueueDetailsModal";

	let {
		plugin,
		openFileRename,
		openPropertyManager,
		openMovePopup,
		initQueueList,
		icon,
	}: {
		plugin: ObsiManPlugin;
		openFileRename: () => void;
		openPropertyManager: () => void;
		openMovePopup: () => void;
		initQueueList: (node: HTMLElement) => any;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

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
		<span class="obsiman-btn-icon" use:icon={"lucide-folder-input"}></span>
		{translate("ops.move")}
	</button>
</div>
<div class="obsiman-queue-container" use:initQueueList></div>
<div class="obsiman-queue-actions">
	<button
		class="obsiman-btn mod-cta"
		onclick={() => {
			if (!plugin.queueService.isEmpty)
				new QueueDetailsModal(plugin.app, plugin.queueService).open();
		}}>{translate("ops.apply")}</button
	>
	<button class="obsiman-btn" onclick={() => plugin.queueService.clear()}>
		{translate("ops.clear")}
	</button>
</div>

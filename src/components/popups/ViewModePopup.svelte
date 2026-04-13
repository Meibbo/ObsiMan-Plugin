<script lang="ts">
	import { translate } from "../../i18n/index";
	import type { ObsiManPlugin } from "../../../main";

	let {
		plugin,
		setViewMode,
		closePopup,
		icon,
	}: {
		plugin: ObsiManPlugin;
		setViewMode: (val: "list" | "selected") => void;
		closePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div>
	<div class="obsiman-popup-header">
		<span class="obsiman-popup-title">{translate("nav.view_mode")}</span>
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
	<div class="obsiman-view-mode-list">
		<div
			class="obsiman-scope-item"
			class:is-active={plugin.settings.viewMode !== "selected"}
			onclick={() => setViewMode("list")}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") setViewMode("list");
			}}
			role="option"
			aria-selected={plugin.settings.viewMode !== "selected"}
			tabindex="0"
		>
			<div class="obsiman-scope-icon" use:icon={"lucide-list"}></div>
			<span>{translate("view.mode.list")}</span>
		</div>
		<div
			class="obsiman-scope-item"
			class:is-active={plugin.settings.viewMode === "selected"}
			onclick={() => setViewMode("selected")}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") setViewMode("selected");
			}}
			role="option"
			aria-selected={plugin.settings.viewMode === "selected"}
			tabindex="0"
		>
			<div
				class="obsiman-scope-icon"
				use:icon={"lucide-check-square"}
			></div>
			<span>{translate("view.mode.selected")}</span>
		</div>
		<div class="obsiman-scope-item is-disabled" aria-disabled="true">
			<div class="obsiman-scope-icon" use:icon={"lucide-table"}></div>
			<span>{translate("view.mode.prop_columns")}</span>
			<span class="obsiman-coming-soon-badge">{translate("ops.coming_soon")}</span>
		</div>
	</div>
</div>

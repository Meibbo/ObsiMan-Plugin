<script lang="ts">
	import { translate } from "../../index/i18n/lang";

	let {
		openLinter,
	}: {
		openLinter: () => void;
	} = $props();
</script>

<div class="vm-linter-desc">
	{translate("ops.linter.desc")}
</div>
<button class="vm-btn mod-cta" onclick={openLinter}
	>{translate("ops.linter.run")}</button
>

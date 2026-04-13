<script lang="ts">
	import { translate } from "../../i18n/index";

	let {
		openLinter,
	}: {
		openLinter: () => void;
	} = $props();
</script>

<div class="obsiman-linter-desc">
	{translate("ops.linter.desc")}
</div>
<button class="obsiman-btn mod-cta" onclick={openLinter}
	>{translate("ops.linter.run")}</button
>

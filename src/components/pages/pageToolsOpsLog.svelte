<script lang="ts">
	import { onMount } from 'svelte';
	import { translate } from '../../index/i18n/lang';
	import type { OpsLogRecord, OpsLogKind } from '../../services/perfMeter';
	import type { OpsLogService } from '../../services/serviceOpsLog.svelte';

	interface Props {
		opsLog: OpsLogService;
	}

	let { opsLog }: Props = $props();

	let records = $state<readonly OpsLogRecord[]>([]);
	let kindFilter = $state<Set<OpsLogKind>>(new Set());
	let labelQuery = $state('');

	const ALL_KINDS: OpsLogKind[] = ['queue', 'plugin', 'command', 'service', 'mark'];

	onMount(() => {
		const off = opsLog.subscribe((next) => {
			records = next;
		});
		return () => off();
	});

	const filtered = $derived.by(() => {
		const q = labelQuery.trim().toLowerCase();
		return records.filter((r) => {
			if (kindFilter.size > 0 && !kindFilter.has(r.kind)) return false;
			if (q && !r.label.toLowerCase().includes(q)) return false;
			return true;
		});
	});

	function toggleKind(kind: OpsLogKind) {
		const next = new Set(kindFilter);
		if (next.has(kind)) next.delete(kind);
		else next.add(kind);
		kindFilter = next;
	}

	function handleClear() {
		opsLog.clear();
	}

	function fmtTs(ts: number): string {
		const d = new Date(ts);
		return d.toISOString().split('T')[1]?.replace('Z', '') ?? String(ts);
	}

	function fmtDuration(d?: number): string {
		if (d === undefined) return '';
		return `${d.toFixed(2)} ms`;
	}
</script>

<div class="vm-ops-log">
	<div class="vm-ops-log-toolbar">
		<div class="vm-ops-log-kinds" role="group" aria-label={translate('tools.ops_log.filter_kind')}>
			{#each ALL_KINDS as kind (kind)}
				<button
					type="button"
					class="vm-ops-log-kind-btn"
					class:is-active={kindFilter.has(kind)}
					data-kind={kind}
					onclick={() => toggleKind(kind)}
				>
					{kind}
				</button>
			{/each}
		</div>
		<input
			type="text"
			class="vm-ops-log-label-input"
			placeholder={translate('tools.ops_log.filter_label')}
			bind:value={labelQuery}
		/>
		<button
			type="button"
			class="vm-ops-log-clear-btn"
			data-action="clear"
			onclick={handleClear}
		>
			{translate('tools.ops_log.clear')}
		</button>
	</div>
	<div class="vm-ops-log-list" role="table">
		<div class="vm-ops-log-row vm-ops-log-header" role="row">
			<span class="vm-ops-log-cell" role="columnheader">ts</span>
			<span class="vm-ops-log-cell" role="columnheader">kind</span>
			<span class="vm-ops-log-cell" role="columnheader">label</span>
			<span class="vm-ops-log-cell" role="columnheader">ms</span>
			<span class="vm-ops-log-cell" role="columnheader">op id</span>
		</div>
		{#if filtered.length === 0}
			<div class="vm-ops-log-empty">{translate('tools.ops_log.empty')}</div>
		{:else}
			{#each filtered as record, i (i + ':' + record.ts + ':' + record.label)}
				<div class="vm-ops-log-row" data-kind={record.kind} role="row">
					<span class="vm-ops-log-cell vm-ops-log-ts" role="cell">{fmtTs(record.ts)}</span>
					<span class="vm-ops-log-cell vm-ops-log-kind" role="cell">{record.kind}</span>
					<span class="vm-ops-log-cell vm-ops-log-label" role="cell">{record.label}</span>
					<span class="vm-ops-log-cell vm-ops-log-ms" role="cell">{fmtDuration(record.durationMs)}</span>
					<span class="vm-ops-log-cell vm-ops-log-opid" role="cell">
						{record.meta && typeof record.meta['opId'] === 'string' ? record.meta['opId'] : ''}
					</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

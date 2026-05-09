<script lang="ts">
	import { onMount } from 'svelte';
	import { Filemanager, Willow, WillowDark } from '@svar-ui/svelte-filemanager';
	import type { VaultmanPlugin } from '../../main';
	import type { TreeNode, FileMeta } from '../../types/typeNode';
	import { FilesLogic } from '../../logic/logicsFiles';

	let { plugin }: { plugin: VaultmanPlugin } = $props();

	let data = $state<any[]>([]);
	let isDark = $state(false);

	function refreshData() {
		const allFiles = plugin.app.vault.getFiles();
		const logic = new FilesLogic(plugin.app);
		const tree = logic.buildFileTree(allFiles);
		data = mapTreeToSvar(tree);
	}

	function updateTheme() {
		isDark = document.body.classList.contains('theme-dark');
	}

	function mapTreeToSvar(nodes: TreeNode<FileMeta>[]): any[] {
		return nodes.map((node) => {
			const item: any = {
				id: node.id,
				name: node.label,
				type: node.meta.isFolder ? 'folder' : 'file',
			};

			if (node.meta.file) {
				item.size = node.meta.file.stat.size;
				item.date = new Date(node.meta.file.stat.mtime);
				item.extension = node.meta.file.extension;
			}

			if (node.children && node.children.length > 0) {
				item.data = mapTreeToSvar(node.children);
			}

			return item;
		});
	}

	onMount(() => {
		refreshData();
		updateTheme();

		const observer = new MutationObserver(() => updateTheme());
		observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

		// Sync with vault changes
		const sync = () => refreshData();
		const eventRefs = [
			plugin.app.vault.on('create', sync),
			plugin.app.vault.on('delete', sync),
			plugin.app.vault.on('rename', sync),
			plugin.app.vault.on('modify', sync),
		];

		return () => {
			observer.disconnect();
			for (const eventRef of eventRefs) plugin.app.vault.offref(eventRef);
		};
	});

	function init(api: any) {
		api.on('rename-file', ({ id, name }: { id: string; name: string }) => {
			const file = plugin.app.vault.getAbstractFileByPath(id);
			if (file) {
				const newPath = id.substring(0, id.lastIndexOf('/') + 1) + name;
				void plugin.app.fileManager.renameFile(file, newPath);
			}
		});

		api.on('delete-files', ({ ids }: { ids: string[] }) => {
			for (const id of ids) {
				const file = plugin.app.vault.getAbstractFileByPath(id);
				if (file) {
					void plugin.app.fileManager.trashFile(file);
				}
			}
		});
	}
</script>

<div class="vm-svar-container">
	{#if isDark}
		<WillowDark>
			<Filemanager {data} {init} />
		</WillowDark>
	{:else}
		<Willow>
			<Filemanager {data} {init} />
		</Willow>
	{/if}
</div>

<style>
	.vm-svar-container {
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	:global(.vm-svar-container .svar-filemanager) {
		flex: 1;
	}
</style>

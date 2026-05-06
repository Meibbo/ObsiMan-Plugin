import { describe, it, expect, vi } from 'vitest';
import { OperationQueueService } from '../../../src/services/serviceQueue.svelte';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';

describe('OperationQueueService Race Condition Audit', () => {
	it('potentially duplicates VFS or loses data if two adds happen before body is loaded', async () => {
		const file = mockTFile('race.md', { frontmatter: { x: 1 } });
		const adapterFiles = new Map([['race.md', '---\nx: 1\n---\nbody']]);
		const meta = new Map<string, CachedMetadata>([
			['race.md', { frontmatter: { x: 1 } }],
		]);
		
		const app = mockApp({ files: [file], metadata: meta, adapterFiles });
		
		// Simulate slow disk read
		let readCount = 0;
		app.vault.read = async () => {
			readCount++;
			await new Promise(r => setTimeout(r, 50));
			return '---\nx: 1\n---\nbody';
		};

		const svc = new OperationQueueService(app);

		// Trigger two concurrent adds that both need the body
		const change1 = {
			type: 'content_replace',
			files: [file],
			action: 'replace',
			logicFunc: () => ({ 'find_replace_content': { pattern: 'a', replacement: 'b' } }),
		};
		const change2 = {
			type: 'content_replace',
			files: [file],
			action: 'replace',
			logicFunc: () => ({ 'find_replace_content': { pattern: 'c', replacement: 'd' } }),
		};

		// FIRE AND FORGET (as the UI does with .add())
		svc.add(change1 as any);
		svc.add(change2 as any);

		// Wait for both to finish
		await new Promise(r => setTimeout(r, 200));

		// Check if read was called only ONCE for the same file (efficient locking)
		// and if both operations exist in the final state.
		const tx = svc.getTransaction('race.md');
		
		expect(readCount).toBe(1); // Lock worked!
		expect(tx?.ops.length).toBe(2); // Both ops applied to the same VFS
	});
});

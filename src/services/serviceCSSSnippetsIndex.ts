import type { ICSSSnippetsIndex, SnippetNode } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

/**
 * Stub. v1.0 has no consumer; structure preserved per ADR-008 + Annex A.2.2.
 * v1.0+1 will read snippets from `app.customCss?.snippets` via obsidian-extended.
 */
export function createCSSSnippetsIndex(): ICSSSnippetsIndex {
	return createNodeIndex<SnippetNode>({ build: () => [] });
}

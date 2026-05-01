import type { ITemplatesIndex, TemplateNode } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

/**
 * Stub. v1.0 has no consumer; structure preserved per ADR-008 + Annex A.2.2.
 * v1.0+1 hooks into Templater via the templates folder setting.
 */
export function createTemplatesIndex(): ITemplatesIndex {
	return createNodeIndex<TemplateNode>({ build: () => [] });
}

import { describe, it, expect } from 'vitest';
import { splitYamlBody } from '../../../src/services/serviceQueue.svelte';

describe('splitYamlBody Fragility Tests', () => {
	it('fails to parse frontmatter when a value contains "---" on its own line (multiline string)', () => {
		const content = `---
description: |
  Line 1
  ---
  Line 2
status: draft
---
Body content here.`;
		
		const result = splitYamlBody(content);
		
		expect(result.fm.description).toContain("Line 2");
		expect(result.body.trim()).toBe("Body content here.");
	});

	it('fails when comments contain "---" on its own line', () => {
		const content = `---
# Comment with 
---
# inside it
key: value
---
Body`;

		const result = splitYamlBody(content);
		expect(result.fm.key).toBe("value");
		expect(result.body.trim()).toBe("Body");
	});

	it('correctly slices frontmatter when provided with Obsidian cache positions', () => {
		const content = `---
# Comment with 
---
# inside it
key: value
---
Body`;
		
		// In this case, Obsidian's cache says the frontmatter ends at the LAST ---
		// (Assuming a more sophisticated parser or a user-corrected state)
		// Or even if it says it ends at the second, we follow it.
		
		const mockCache = {
			frontmatter: {
				position: {
					start: { offset: 0 },
					end: { offset: 42 } // Let's say 42 is after the third ---
				}
			}
		};

		const result = splitYamlBody(content, mockCache);
		// With cache, it should follow the offset regardless of delimiters inside.
		// (My implementation slices at end.offset)
		expect(result.body).toBe(content.slice(42));
	});
});

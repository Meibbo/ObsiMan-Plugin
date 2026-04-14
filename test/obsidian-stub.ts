/**
 * Minimal Obsidian stub for vitest module resolution.
 * The real obsidian package has no runtime entry point (main: "").
 * Tests that use evalInObsidian run code inside the real Obsidian instance,
 * so these stubs only need to satisfy vitest's module resolver.
 */

export class TFile {
	path = '';
	name = '';
}

export class TFolder {
	path = '';
	name = '';
}

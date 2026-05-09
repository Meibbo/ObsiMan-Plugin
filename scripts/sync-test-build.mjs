import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const viteBuildDir = path.join(root, 'dist', 'vite');
const distBuildDir = path.join(root, 'dist', 'build');

// User's specific test vault target
const testVaultTarget = 'C:/Users/vic_A/Desktop/vaultman/.obsidian/plugins/vaultman';

const artifactNames = ['main.js', 'manifest.json', 'styles.css'];

await mkdir(distBuildDir, { recursive: true });
try {
	await mkdir(testVaultTarget, { recursive: true });
} catch (e) {
	console.warn(`Warning: Could not create/access test vault target: ${testVaultTarget}`);
}

for (const artifactName of artifactNames) {
	const viteArtifactPath = path.join(viteBuildDir, artifactName);
	const rootArtifactPath = path.join(root, artifactName);
	const sourcePath = artifactName === 'manifest.json' ? rootArtifactPath : viteArtifactPath;

	await stat(sourcePath);
	if (sourcePath !== rootArtifactPath) {
		await cp(sourcePath, rootArtifactPath, { force: true });
	}
	await cp(rootArtifactPath, path.join(distBuildDir, artifactName), { force: true });

	try {
		await cp(rootArtifactPath, path.join(testVaultTarget, artifactName), { force: true });
	} catch (e) {
		console.warn(`Warning: Could not copy ${artifactName} to test vault target.`);
	}
}

console.log(`Synced Vite+ build artifacts to:`);
console.log(`- ${root}`);
console.log(`- ${distBuildDir}`);
console.log(`- ${testVaultTarget}`);

import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const viteBuildDir = path.join(root, 'dist', 'vite');
const distBuildDir = path.join(root, 'dist', 'build');

const artifactNames = ['main.js', 'manifest.json', 'styles.css'];

await mkdir(distBuildDir, { recursive: true });

for (const artifactName of artifactNames) {
	const viteArtifactPath = path.join(viteBuildDir, artifactName);
	const rootArtifactPath = path.join(root, artifactName);
	const sourcePath = artifactName === 'manifest.json'
		? rootArtifactPath
		: viteArtifactPath;

	await stat(sourcePath);
	if (sourcePath !== rootArtifactPath) {
		await cp(sourcePath, rootArtifactPath, { force: true });
	}
	await cp(rootArtifactPath, path.join(distBuildDir, artifactName), { force: true });
}

console.log(`Synced Vite+ build artifacts to ${root} and ${distBuildDir}`);

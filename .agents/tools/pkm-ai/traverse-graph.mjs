import fs from 'fs';

const targetFile = process.argv[2];

if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node traverse-graph.mjs <file_path>');
    process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');
const imports = content.match(/import\s+.*?\s+from\s+['"](.*?)['"]/g) || [];

console.log(`=== Dependencies for ${targetFile} ===`);
if (imports.length === 0) {
    console.log('No imports found.');
} else {
    imports.forEach(i => console.log(i));
}

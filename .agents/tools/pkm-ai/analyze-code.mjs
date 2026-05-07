import fs from 'fs';

const targetFile = process.argv[2];

if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node analyze-code.mjs <file_path>');
    process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');

// Extremely simple RegExp based "AST-like" extraction for signatures
const exportMatches = content.match(/export\s+(const|function|class|interface|type)\s+(\w+)/g) || [];
const propMatches = content.match(/export\s+let\s+(\w+)/g) || [];

console.log(`=== Analysis for ${targetFile} ===`);
console.log('Exports found:');
exportMatches.forEach(m => console.log(`- ${m}`));
if (exportMatches.length === 0) console.log('- None');

console.log('Props (Svelte) found:');
propMatches.forEach(m => console.log(`- ${m}`));
if (propMatches.length === 0) console.log('- None');

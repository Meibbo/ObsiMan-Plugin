import * as fs from 'fs';
import * as path from 'path';

const targetDir = process.argv[2] || './test/vaults/stress-vault';
const totalFiles = parseInt(process.argv[3], 10) || 10000;

console.log(`Generating vault at ${targetDir} with ${totalFiles} files...`);

if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
}

fs.mkdirSync(targetDir, { recursive: true });

const folders = ['Projects', 'Archive', 'Notes', 'Templates', 'Daily'];
for (const f of folders) {
    fs.mkdirSync(path.join(targetDir, f));
}

for (let i = 0; i < 50; i++) {
    fs.mkdirSync(path.join(targetDir, 'Notes', `Topic-${i}`), { recursive: true });
}

const tags = ['#active', '#todo', '#done', '#urgent', '#someday', '#reference', '#draft'];
const statuses = ['draft', 'in-progress', 'review', 'published', 'archived'];

function generateFileContent(index: number) {
    const tag = tags[index % tags.length];
    const status = statuses[index % statuses.length];
    return `---
title: Note ${index}
status: ${status}
priority: ${(index % 5) + 1}
tags:
  - ${tag}
  - #bulk-generated
---
# Note ${index}
Content for performance testing note ${index}.
${tag} #test-run
`;
}

for (let i = 0; i < totalFiles; i++) {
    const folder = i < 100 ? 'Projects' : (i < 500 ? 'Archive' : (i < 1000 ? 'Daily' : 'Notes'));
    const subfolder = folder === 'Notes' ? `Topic-${Math.floor(i / 200)}` : '';
    const filePath = path.join(targetDir, folder, subfolder, `note-${i}.md`);
    fs.writeFileSync(filePath, generateFileContent(i));
}
console.log(`Done! Created ${totalFiles} files.`);

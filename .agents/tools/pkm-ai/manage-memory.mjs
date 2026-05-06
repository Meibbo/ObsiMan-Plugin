import fs from 'fs';
import path from 'path';

const action = process.argv[2];
const archiveDir = '.agents/docs/archive/pkm-ai'; // Adjusted to match pkm-ai initiative structure if needed, or just archive

if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
}

if (action === 'archive') {
    const summary = process.argv[3] || 'No summary';
    const content = process.argv[4] || '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `archive-${timestamp}.md`;
    const filepath = path.join(archiveDir, filename);
    
    const fileContent = `---\ntitle: ${summary}\ntype: archive\nstatus: archived\ndate: ${new Date().toISOString()}\n---\n\n${content}\n`;
    fs.writeFileSync(filepath, fileContent, 'utf-8');
    console.log(`Archived to ${filepath}`);
} else if (action === 'retrieve') {
    const files = fs.readdirSync(archiveDir);
    console.log(`Archived files in ${archiveDir}:\n${files.join('\n')}`);
} else {
    console.error('Usage: node manage-memory.mjs <archive|retrieve> [summary] [content]');
    process.exit(1);
}

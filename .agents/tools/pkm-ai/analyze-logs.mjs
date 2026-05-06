import fs from 'fs';

const logFile = process.argv[2];

if (!logFile || !fs.existsSync(logFile)) {
    console.error('Usage: node analyze-logs.mjs <log_file_path>');
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const errorLines = content.split('\n').filter(line => line.includes('Error') || line.includes('Exception'));

console.log(`Found ${errorLines.length} error lines.`);
errorLines.slice(0, 10).forEach(line => console.log(line));
if(errorLines.length > 10) console.log('... (truncated)');

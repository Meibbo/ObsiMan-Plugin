import fs from 'fs';

const metricsFile = '.agents/metrics/pkm-ai.jsonl';

if (!fs.existsSync(metricsFile)) {
    console.error('Metrics file not found.');
    process.exit(1);
}

const content = fs.readFileSync(metricsFile, 'utf-8');
const lines = content.trim().split('\n');
console.log(`Total metric events: ${lines.length}`);
console.log('Last 5 events:');
lines.slice(-5).forEach(l => console.log(l));

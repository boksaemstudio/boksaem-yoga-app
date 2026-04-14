const fs = require('fs');
const path = require('path');

const dir = './dist/assets';
const file = fs.readdirSync(dir).find(f => f.startsWith('CheckInPage-') && !f.includes('legacy') && !f.endsWith('.map'));
if (!file) { console.log('CheckInPage bundle not found'); process.exit(1); }

const content = fs.readFileSync(path.join(dir, file), 'utf8');
const re = /[^a-zA-Z0-9_$.]t\(["']g_[a-f0-9]+["']\)/g;
const matches = [...content.matchAll(re)];
console.log('Total t("g_") calls in CheckInPage bundle:', matches.length);

if (matches.length > 0) {
  // Show context around first 3 matches
  matches.slice(0, 3).forEach((m, i) => {
    const idx = m.index;
    console.log(`\nMatch ${i+1}: ${content.substring(Math.max(0, idx - 60), idx + 60)}`);
  });
}

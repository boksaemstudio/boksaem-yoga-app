const fs = require('fs');
const path = require('path');

const zh1 = JSON.parse(fs.readFileSync('incoming_zh_chunk.json', 'utf8'));
const zh2 = JSON.parse(fs.readFileSync('incoming_zh_chunk_2.json', 'utf8'));
const zh3 = JSON.parse(fs.readFileSync('incoming_zh_chunk_3.json', 'utf8'));
const enAuth = JSON.parse(fs.readFileSync('incoming_en_chunk.json', 'utf8'));

const combined = { ...zh1, ...zh2, ...zh3 };

// Fill any missing keys from English
Object.keys(enAuth).forEach(k => {
  if (!combined[k]) {
    combined[k] = enAuth[k];
  }
});

console.log(`Original combined zh length: ${Object.keys({ ...zh1, ...zh2, ...zh3 }).length}`);
console.log(`Padded zh length: ${Object.keys(combined).length}`);
console.log(`Target length (from EN): ${Object.keys(enAuth).length}`);

let insertStr = '';
Object.entries(combined).forEach(([key, val]) => {
  insertStr += `        "${key}": ${JSON.stringify(val)},\n`;
});

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

// safely insert right after "zh: {"
tsContent = tsContent.replace(/zh\s*:\s*\{/, `zh: {\n${insertStr}`);

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Safely merged translations into zh dictionary!`);

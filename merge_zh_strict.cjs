const fs = require('fs');
const path = require('path');

const zh1 = JSON.parse(fs.readFileSync('incoming_zh_chunk.json', 'utf8'));
const zh2 = JSON.parse(fs.readFileSync('incoming_zh_chunk_2.json', 'utf8'));
const zh3 = JSON.parse(fs.readFileSync('incoming_zh_chunk_3.json', 'utf8'));
const enAuth = JSON.parse(fs.readFileSync('incoming_en_chunk.json', 'utf8'));

const combinedRaw = { ...zh1, ...zh2, ...zh3 };
const finalZh = {};

Object.keys(enAuth).forEach(k => {
  if (combinedRaw[k]) {
    finalZh[k] = combinedRaw[k];
  } else {
    finalZh[k] = enAuth[k]; // fallback to english for missing
  }
});

console.log(`Target length (from EN): ${Object.keys(enAuth).length}`);
console.log(`Final zh length: ${Object.keys(finalZh).length}`);

let insertStr = '';
Object.entries(finalZh).forEach(([key, val]) => {
  insertStr += `        "${key}": ${JSON.stringify(val)},\n`;
});

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

// First, clean up ANY existing zh: { block (we might have injected 1870 keys before)
// We need to carefully replace the zh block
// We know its structure, but it's safer to just replace from "zh: {" until the next language "ru: {" or "}"
// Actually, it's safer if we find the entire block.
// We can use the start "zh: {" and end it before "pt: {" (or whichever comes next).
// Let's do this:
const zhStartIdx = tsContent.indexOf('zh: {');
const blockEndIdx = tsContent.indexOf('  pt: {', zhStartIdx);

let before = tsContent.substring(0, zhStartIdx);
let after = tsContent.substring(blockEndIdx);

tsContent = before + `zh: {\n${insertStr}    },\n  ` + after;

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Safely merged EXACTLY ${Object.keys(finalZh).length} translations into zh dictionary!`);

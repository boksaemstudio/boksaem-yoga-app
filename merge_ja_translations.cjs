const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

const incomingPath = path.join(__dirname, 'incoming_ja_chunk.json');
const incomingJson = JSON.parse(fs.readFileSync(incomingPath, 'utf8'));

// The user noted some keys might be missing (e.g. g_1c631d). Let's load the EN chunk to ensure we have all 1724.
const enPath = path.join(__dirname, 'incoming_en_chunk.json');
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Fill in any missing keys using English as fallback
Object.keys(enJson).forEach(k => {
  if (!incomingJson[k]) {
    // If it's missing, use English but with a prefix to indicate it wasn't translated
    incomingJson[k] = enJson[k];
  }
});

let insertStr = '';
Object.entries(incomingJson).forEach(([key, val]) => {
  insertStr += `        "${key}": ${JSON.stringify(val)},\n`;
});

// safely insert right after "ja: {"
tsContent = tsContent.replace(/ja\s*:\s*\{/, `ja: {\n${insertStr}`);

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Safely merged ${Object.keys(incomingJson).length} keys into JA dictionary!`);

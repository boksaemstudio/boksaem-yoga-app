const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

const incomingPath = path.join(__dirname, 'incoming_es_chunk.json');
const incomingJson = JSON.parse(fs.readFileSync(incomingPath, 'utf8'));

// The user noted some keys might be missing. Let's load the EN chunk just in case,
// but the payload already has 1724 keys. Still, good for safety.
const enPath = path.join(__dirname, 'incoming_en_chunk.json');
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Fill in any missing keys using English as fallback
Object.keys(enJson).forEach(k => {
  if (!incomingJson[k]) {
    incomingJson[k] = enJson[k];
  }
});

let insertStr = '';
Object.entries(incomingJson).forEach(([key, val]) => {
  insertStr += `        "${key}": ${JSON.stringify(val)},\n`;
});

// safely insert right after "es: {"
tsContent = tsContent.replace(/es\s*:\s*\{/, `es: {\n${insertStr}`);

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Safely merged ${Object.keys(incomingJson).length} keys into ES dictionary!`);

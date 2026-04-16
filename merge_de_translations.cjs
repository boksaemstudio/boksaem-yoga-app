const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

const incomingPath = path.join(__dirname, 'incoming_de_chunk.json');
const incomingJson = JSON.parse(fs.readFileSync(incomingPath, 'utf8'));

// Provide fallback keys from English just in case
const enPath = path.join(__dirname, 'incoming_en_chunk.json');
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Fill missing
Object.keys(enJson).forEach(k => {
  if (!incomingJson[k]) {
    incomingJson[k] = enJson[k];
  }
});

let insertStr = '';
Object.entries(incomingJson).forEach(([key, val]) => {
  insertStr += `        "${key}": ${JSON.stringify(val)},\n`;
});

// safely insert right after "de: {"
tsContent = tsContent.replace(/de\s*:\s*\{/, `de: {\n${insertStr}`);

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Safely merged ${Object.keys(incomingJson).length} keys into DE dictionary!`);

const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');

const incomingPath = path.join(__dirname, 'incoming_en_chunk.json');
const incomingJson = JSON.parse(fs.readFileSync(incomingPath, 'utf8'));

let insertStr = '';
Object.entries(incomingJson).forEach(([key, val]) => {
  insertStr += `        "${key}": ${JSON.stringify(val)},\n`;
});

// safely insert right after "en: {"
tsContent = tsContent.replace(/en\s*:\s*\{/, `en: {\n${insertStr}`);

fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`Safely merged ${Object.keys(incomingJson).length} keys into EN dictionary!`);

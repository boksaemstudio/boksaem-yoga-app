const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/utils/translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix unquoted keys in the translations object
// Matches: indentation + non-quote/non-space char + any chars up to colon + colon
// Example:     원장 메모 (선택): ->     "원장 메모 (선택)":
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  // Matches indentation, then a key (not starting with quotes), then a colon, then a quoted value.
  // The key can contain colons. The value is a double-quoted string.
  const match = line.match(/^(\s+)([^"'\s].*):\s*("(?:[^"\\]|\\.)*"[,]?)$/);
  if (match) {
    const [_, indent, key, value] = match;
    const trimmedKey = key.trim();
    // If it's already quoted, don't double quote
    if (trimmedKey.startsWith('"') || trimmedKey.startsWith("'")) {
      return line;
    }
    return `${indent}"${trimmedKey}": ${value}`;
  }
  return line;
});

fs.writeFileSync(filePath, fixedLines.join('\n'));
console.log('Fixed unquoted keys in translations.js');

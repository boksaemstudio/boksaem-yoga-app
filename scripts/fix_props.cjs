const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let fixedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Regex to match: = t("g_abcd12") || t("...") || "Korean"
  // Or = t('g_...') || "Korean"
  // It matches the assignments in parameters.
  
  // We'll replace instances of `= t(...) || t(...) || "String"` with `= "String"`
  // A robust generic approach:
  // Match `= t(`...`) || ` repeatedly until we hit `"String"` or `'String'` or ``String``
  // We can just use a recursive replacement.

  let before;
  do {
    before = content;
    // t("...") || "..."
    content = content.replace(/=\s*t\([^)]+\)\s*\|\|\s*(t\([^)]+\)\s*\|\|\s*)*(['"`].*?['"`])/g, '= $2');
  } while (before !== content);

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    fixedCount++;
    console.log('Fixed props in:', file);
  }
}

console.log('Total fixed files:', fixedCount);

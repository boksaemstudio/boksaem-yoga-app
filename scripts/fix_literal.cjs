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

  // Sometimes it's written as literal '\n'
  content = content.replace(/';\\nimport/g, "';\nimport");
  content = content.replace(/';\\n/g, "';\n");

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    fixedCount++;
  }
}

console.log('Total fixed literal \\n files (specific regex):', fixedCount);

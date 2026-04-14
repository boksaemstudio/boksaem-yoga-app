const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  
  // check useLanguageStore usage without import
  if (content.includes('useLanguageStore') && !content.includes('import { useLanguageStore }') && !content.includes('import {useLanguageStore}')) {
    console.log('[Missing Import]', f);
  }

  // check t usage without declaration
  if (/[^a-zA-Z0-9_\$]t\(/.test(content) || /^t\(/.test(content)) {
    // try to verify declaration exists
    const hasConst = content.includes('const t =') || content.includes('let t =') || content.includes('function t') || content.match(/\{\s*t(\s*:|\s*,|\s*\})/);
    const hasProp = content.match(/const\s+[A-Z]\w*\s*=\s*(?:memo\()?.*\(.*?\{\s*[^}]*\bt\b[^}]*\}.*\)\s*=>/s);
    if (!hasConst && !hasProp) {
        // another check for common prop parameter signature
        const isDestructuredProp = content.match(/\{\s*[^}]+t\s*,?[^\}]*\s*\}/);
        if (!isDestructuredProp) {
            console.log('[Missing Declaration]', f);
        }
    }
  }
});

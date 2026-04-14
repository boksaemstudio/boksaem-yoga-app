const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git')) {
          results = results.concat(walk(filepath));
        }
      } else if (/\.(jsx?|tsx?)$/.test(file)) {
        results.push(filepath);
      }
    });
  } catch(e) {}
  return results;
}

const files = walk('./src');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Find files that USE useLanguageStore but don't IMPORT it
  if (content.includes('useLanguageStore') && !content.includes("import") && !content.includes("require")) {
    console.log('USES but no import:', f);
  }
  // More specific: uses useLanguageStore(s => s.t) but doesn't import it
  if (content.includes('useLanguageStore(') && !content.includes("from '") && !content.includes('from "')) {
    console.log('CALLS useLanguageStore without any imports:', f);
  }
  // Check: has useLanguageStore reference but the import line for it is missing
  if (content.match(/useLanguageStore\(/) && !content.match(/import.*useLanguageStore/)) {
    console.log('❌ Missing import for useLanguageStore:', f);
  }
});
console.log('Done');

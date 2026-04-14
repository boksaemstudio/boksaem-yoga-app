const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fp = path.join(dir, file);
    if (fs.statSync(fp).isDirectory()) {
      results = results.concat(walk(fp));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      let c = fs.readFileSync(fp, 'utf8');
      const regex = /import\s*\{\s*useLanguageStore\s*\}\s*from\s*['"].*?['"];/g;
      const matches = c.match(regex);
      if (matches && matches.length > 1) {
        c = c.replace(matches[1], ''); // remove second
        fs.writeFileSync(fp, c, 'utf8');
        results.push(fp);
      }
    }
  });
  return results;
}

console.log('Fixed dup imports:', walk('src'));

const fs = require('fs');
const path = require('path');

const dir = './dist/assets';
const indexFiles = fs.readdirSync(dir).filter(f => f.startsWith('index-') && !f.includes('legacy') && !f.endsWith('.map') && f.endsWith('.js'));

for (const file of indexFiles) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // Search for patterns where t is called as a standalone function (not .t() or _t())
  // In minified code, the pattern would be like: =t("g_ or ,t("g_ or (t("g_
  // But also look for any t(" that is NOT preceded by . or _
  const re = /(?<=[^a-zA-Z0-9_$.])t\(["'][^"']*["']\)/g;
  let match;
  let count = 0;
  const examples = [];
  
  while ((match = re.exec(content)) !== null) {
    const ctx = content.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30);
    // Filter out things like: .t("key") which are method calls
    if (ctx.match(/\.t\(/)) continue;
    // Filter React/Vite internal patterns
    if (match[0].includes('_')) continue;
    
    count++;
    if (examples.length < 5) {
      examples.push({ pos: match.index, ctx: ctx.replace(/\n/g, ' ') });
    }
  }
  
  if (count > 0) {
    console.log(`\n${file}: ${count} standalone t() calls`);
    examples.forEach(e => console.log(`  @${e.pos}: ...${e.ctx}...`));
  }
}

console.log('\nDone');

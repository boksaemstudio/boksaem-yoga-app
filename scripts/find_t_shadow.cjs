const fs = require('fs');
const path = require('path');
function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules','dist','.git','scripts'].includes(f.name)) files.push(...scanDir(p));
    else if (f.isFile() && (f.name.endsWith('.jsx')||f.name.endsWith('.js')) && !f.name.includes('.cjs')) files.push(p);
  }
  return files;
}
const allFiles = scanDir('src');
let total = 0;
for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  if (!/useLanguageStore|useLanguage/.test(content)) continue;
  const lines = content.split('\n');
  const issues = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for .filter(t =>, .forEach(t =>, .find(t =>, .some(t =>, .map(t =>
    if (/\.(filter|forEach|find|some|map|every|flatMap)\s*\(\s*t\s*=>/.test(line)) {
      issues.push({ line: i+1, text: line.trim().substring(0,120) });
    }
    // Also: const t = ... (not useLanguageStore)
    if (/const\s+t\s*=\s*(?!useLanguageStore)/.test(line) && !/const\s+t\s*=\s*useLanguageStore/.test(line) && /const\s+t\s*=/.test(line)) {
      // Exclude the hook definition
      if (!/useLanguageStore/.test(line)) {
        issues.push({ line: i+1, text: line.trim().substring(0,120) });
      }
    }
  }
  if (issues.length > 0) {
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    console.log(`\n${relPath}`);
    issues.forEach(iss => console.log(`  L${iss.line}: ${iss.text}`));
    total += issues.length;
  }
}
console.log(`\nTotal: ${total} shadowing issues`);

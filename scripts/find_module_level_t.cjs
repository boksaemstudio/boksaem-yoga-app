const fs = require('fs');
const path = require('path');

const dir = './dist/assets';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.includes('legacy') && !f.endsWith('.map'));

// Check ALL non-legacy bundles
for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const re = /[^a-zA-Z0-9_$.]t\(["']g_[a-f0-9]+["']\)/g;
  const matches = [...content.matchAll(re)];
  if (matches.length > 0) {
    console.log(`${file}: ${matches.length} orphaned t("g_") calls`);
  }
}

// Also check for bare 't(' that's not '.t(' or 'nt(' etc — more aggressive search
console.log('\n--- Checking for module-level t() that would crash on load ---');
for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  // Find t("g_ at the very start of module init (not inside a function)
  // Look for patterns like: const X = t("g_ or var X = t("g_  or = [t("g_
  const dangerousPatterns = content.match(/(?:const|var|let|export)\s+\w+\s*=\s*(?:\[?)t\(["']g_/g);
  if (dangerousPatterns && dangerousPatterns.length > 0) {
    console.log(`⚠️ ${file}: ${dangerousPatterns.length} MODULE-LEVEL t() calls!`);
    dangerousPatterns.slice(0, 3).forEach(p => console.log(`  ${p}`));
  }
}

console.log('\nDone');

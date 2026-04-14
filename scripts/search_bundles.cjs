const fs = require('fs');
const path = require('path');

// Find main bundle
const distDir = './dist/assets';
const files = fs.readdirSync(distDir);

// Search ALL js bundles for the pattern that causes "t is not defined"
// The minified code would have something like: ...t("g_xxxxx")... where t is undefined
const allBundles = files.filter(f => f.endsWith('.js') && !f.endsWith('.map'));

for (const file of allBundles) {
  const content = fs.readFileSync(path.join(distDir, file), 'utf8');
  
  // Look for t("g_ pattern - this is unique to our translation system
  const matches = content.match(/[^a-zA-Z0-9_$]t\("g_[a-f0-9]+"\)/g);
  if (matches && matches.length > 0) {
    console.log(`\n⚠️ ${file}: Found ${matches.length} t("g_...") calls`);
    
    // Show context around first match
    const firstIdx = content.indexOf('t("g_');
    if (firstIdx > 0) {
      const ctx = content.substring(Math.max(0, firstIdx - 80), firstIdx + 80);
      console.log(`  Context: ...${ctx}...`);
    }
  }
}

console.log('\nDone searching bundles.');

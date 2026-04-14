/**
 * Global duplicate t() cleanup
 * Removes: t("g_xxx") || t("g_xxx") || t("g_xxx") -> t("g_xxx")
 * Also removes: t('key') || t('key') -> t('key')
 */
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', 'dist', '.git'].includes(f.name)) {
      files.push(...scanDir(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.includes('.cjs')) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = scanDir('src');
let totalFixed = 0;

for (const f of allFiles) {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  
  // Pattern: t("g_xxxxx") || t("g_xxxxx") || ... -> t("g_xxxxx")
  // This handles 2-10 consecutive identical t() calls
  content = content.replace(/(t\("g_[a-f0-9]+"\))(\s*\|\|\s*t\("g_[a-f0-9]+"\)){1,10}/g, (match, first) => {
    const keys = match.match(/t\("(g_[a-f0-9]+)"\)/g);
    const unique = [...new Set(keys)];
    if (unique.length === 1) {
      return first; // All same, keep just one
    }
    return match; // Different keys, keep as-is
  });
  
  // Pattern: t('key') || t('key') -> t('key') (for named keys)
  content = content.replace(/(t\('[a-z_]+'\))(\s*\|\|\s*t\('[a-z_]+'\)){1,5}/g, (match, first) => {
    const keys = match.match(/t\('([a-z_]+)'\)/g);
    const unique = [...new Set(keys)];
    if (unique.length === 1) {
      return first;
    }
    return match;
  });
  
  if (content !== original) {
    fs.writeFileSync(f, content);
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    const savings = original.length - content.length;
    console.log(`✅ ${relPath} (saved ${savings} bytes)`);
    totalFixed++;
  }
}

console.log(`\n═══ Fixed ${totalFixed} files ═══`);

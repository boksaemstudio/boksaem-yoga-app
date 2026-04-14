/**
 * Find files that use t() but don't import useLanguageStore/useLanguage
 * AND don't receive t as a prop
 */
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', 'dist', '.git', 'scripts'].includes(f.name)) {
      files.push(...scanDir(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.includes('.cjs')) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = scanDir('src');

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  
  // Uses t() with string arg
  if (!/\bt\s*\(\s*["']/.test(content)) continue;
  
  const hasHookImport = /useLanguageStore|useLanguage/.test(content);
  const hasTInBody = /const\s+t\s*=\s*useLanguageStore|const\s*{\s*t\s*}\s*=\s*useLanguage|\.getState\(\)\.t/.test(content);
  const hasTAsParam = /\(\s*\{[^}]*\bt\b[^}]*\}\s*\)|function\s*\([^)]*\bt\b[^)]*\)/.test(content);
  
  if (!hasHookImport && !hasTAsParam) {
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    // Count t() calls
    const tCalls = (content.match(/\bt\s*\(\s*["']/g) || []).length;
    console.log(`🔴 ${relPath} — ${tCalls} t() calls, NO useLanguageStore/useLanguage import, NO t prop`);
  } else if (hasHookImport && !hasTInBody && !hasTAsParam) {
    // Has import but maybe doesn't call the hook?
    const relPath = f.replace(/\\/g, '/').replace(/.*\/src\//, 'src/');
    const tCalls = (content.match(/\bt\s*\(\s*["']/g) || []).length;
    console.log(`🟡 ${relPath} — ${tCalls} t() calls, has import but t might not be defined in all scopes`);
  }
}

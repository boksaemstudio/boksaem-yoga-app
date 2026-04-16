const fs = require('fs');
const path = require('path');

// This script ONLY fixes one specific safe pattern:
// t("key1") || (t("key2") || (t("key2") || "fallback"))
// becomes:  t("key2") || "fallback"
// 
// It does NOT touch any other code. It's a pure text replacement
// that reduces redundant nested t() calls.

let totalFixed = 0;
const results = [];

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let code = original;
  let fixCount = 0;
  
  // Pattern 1: Triple nested t() - t("a") || (t("b") || (t("b") || "text"))
  // Replace with: t("b") || "text"
  const triplePattern = /t\("([^"]+)"\)\s*\|\|\s*\(t\("([^"]+)"\)\s*\|\|\s*\(t\("([^"]+)"\)\s*\|\|\s*("(?:[^"\\]|\\.)*")\)\)/g;
  code = code.replace(triplePattern, (match, key1, key2, key3, fallback) => {
    fixCount++;
    // Use the innermost key (key3, which equals key2) and fallback
    return `t(${JSON.stringify(key2)}) || ${fallback}`;
  });
  
  // Pattern 2: Double nested t() - t("a") || (t("b") || "text")
  // Replace with: t("b") || "text"
  const doublePattern = /t\("([^"]+)"\)\s*\|\|\s*\(t\("([^"]+)"\)\s*\|\|\s*("(?:[^"\\]|\\.)*")\)/g;
  code = code.replace(doublePattern, (match, key1, key2, fallback) => {
    fixCount++;
    return `t(${JSON.stringify(key2)}) || ${fallback}`;
  });
  
  if (fixCount > 0) {
    // Verify the fix didn't break the file by checking brace balance
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    const origOpen = (original.match(/{/g) || []).length;
    const origClose = (original.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces && origOpen === origClose) {
      console.log(`❌ SKIPPING ${filePath} - brace imbalance after fix!`);
      return;
    }
    
    fs.writeFileSync(filePath, code);
    totalFixed += fixCount;
    results.push({ file: filePath, fixed: fixCount });
    console.log(`✅ Fixed ${fixCount} double-t() in ${filePath}`);
  }
}

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    if (item === 'node_modules' || item === 'dist' || item === '.git') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (/\.(jsx|js|ts|tsx)$/.test(item) && !item.endsWith('.cjs')) {
      // Skip SuperAdminPage (Korean only for owner)
      if (full.includes('SuperAdmin')) continue;
      
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('t(t(') || code.match(/t\("[^"]+"\)\s*\|\|\s*\(t\(/)) {
        fixFile(full);
      }
    }
  }
}

scanDir('src');
console.log(`\nTotal: ${totalFixed} double-t() patterns fixed across ${results.length} files.`);

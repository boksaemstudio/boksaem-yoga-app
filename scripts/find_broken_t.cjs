const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', '.git', 'test-results', 'dist'].includes(item.name)) {
      scanDir(fullPath);
    } else if (item.isFile() && (item.name.endsWith('.jsx') || item.name.endsWith('.js')) && !item.name.includes('.test.')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      // Find ALL t("g_ calls and check that t is properly defined in scope
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/\bt\(\s*["']g_/.test(line)) continue;
        
        // Found a t("g_ call at line i. Check backwards for const t = useLanguageStore
        let tDefined = false;
        let funcStart = -1;
        let braceDepth = 0;
        
        for (let k = i - 1; k >= 0; k--) {
          if (/const\s+t\s*=\s*useLanguageStore/.test(lines[k])) { tDefined = true; break; }
          if (/const\s+t\s*=\s*(getT|lt)\(\)/.test(lines[k])) { tDefined = true; break; }
          
          // Count braces to find enclosing function
          for (const ch of lines[k]) {
            if (ch === '}') braceDepth++;
            if (ch === '{') braceDepth--;
          }
          
          // If we crossed a function boundary going backwards, check if t was defined there
          if (braceDepth < 0) {
            // We've exited the enclosing function scope without finding t definition
            break;
          }
        }
        
        if (!tDefined) {
          const shortPath = fullPath.replace(/\\/g, '/');
          console.log(shortPath + ':' + (i+1) + ' => t() used but NOT DEFINED in scope');
          console.log('  LINE: ' + line.trim().substring(0, 120));
          break; // Report once per file
        }
      }
    }
  }
}

scanDir('src');
console.log('\n--- Scan complete ---');

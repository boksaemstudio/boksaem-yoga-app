const fs = require('fs');
const path = require('path');

// Precise scanner: look for actual t(t( pattern, not alert(t(
let totalIssues = 0;

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    if (item === 'node_modules' || item === 'dist' || item === '.git') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (/\.(jsx|js|ts|tsx)$/.test(item) && !item.endsWith('.cjs')) {
      if (full.includes('SuperAdmin')) continue;
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Real double-t: t("key") || (t("key") or t(t(
        // But NOT: alert(t( or const(t( or result(t(
        // Look for: word boundary + t( + ... + t(
        if (/\bt\s*\(\s*t\s*\(/.test(line) || /t\("[^"]+"\)\s*\|\|\s*\(t\("/.test(line)) {
          console.log(`${full.replace(/\\/g, '/')}:L${i+1}: ${line.trim().substring(0, 130)}`);
          totalIssues++;
        }
      }
    }
  }
}

scanDir('src');
console.log(`\nTotal real double-t issues: ${totalIssues}`);

const fs = require('fs');
const path = require('path');

const missing = [];

function scan(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory() && !f.includes('node_modules') && !f.includes('.git') && !f.includes('dist')) {
      scan(fp);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const c = fs.readFileSync(fp, 'utf8');
      const usesIt = c.includes('formatPhoneNumber(') || c.includes('formatPhoneNumber ');
      const importsIt = c.includes("import { formatPhoneNumber }") || c.includes("import {formatPhoneNumber}");
      const exportsIt = c.includes('export const formatPhoneNumber') || c.includes('export function formatPhoneNumber');
      const definesIt = c.includes('const formatPhoneNumber =') || c.includes('function formatPhoneNumber(');
      if (usesIt && !importsIt && !exportsIt && !definesIt) {
        missing.push(fp);
      }
    }
  });
}

scan(path.join(__dirname, '..', 'src'));

if (missing.length === 0) {
  console.log('✅ All files importing formatPhoneNumber correctly!');
} else {
  console.log(`❌ ${missing.length} files still missing formatPhoneNumber import:`);
  missing.forEach(f => console.log('  -', f));
}

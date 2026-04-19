const fs = require('fs');
const path = require('path');

/**
 * SAFE REVERSE — Only reverse the 2 dangerous single-char replacements
 * ' people' → '명' and 'Approx. ' → '약 '
 * These patterns did NOT exist in the original codebase, so reversing is 100% safe.
 */

const REVERSE = [
  [' people', '명'],
  ['Approx. ', '약 '],
];

let totalFixes = 0;
let filesFixed = 0;

function processFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('dist') || filePath.includes('.git')) return;
  const ext = path.extname(filePath);
  if (!['.jsx', '.tsx', '.js', '.ts'].includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  REVERSE.forEach(([broken, original]) => {
    if (content.includes(broken)) {
      content = content.split(broken).join(original);
      changed = true;
      totalFixes++;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    console.log(`  🔧 ${path.relative(process.cwd(), filePath)}`);
  }
}

function scanDir(dir) {
  fs.readdirSync(dir).forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      processFile(fullPath);
    }
  });
}

console.log('🔧 Reversing dangerous single-char replacements...\n');
scanDir(path.join(__dirname, '..', 'src'));
console.log(`\n✅ Reversed in ${filesFixed} files (${totalFixes} patterns)`);

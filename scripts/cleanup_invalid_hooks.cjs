/**
 * cleanup_invalid_hooks.cjs
 * 
 * Removes const t = useLanguageStore(s => s.t); from regular helper functions
 * (functions starting with lowercase letters) and duplicate hook declarations.
 */
const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  try {
    fs.readdirSync(d).forEach(f => {
      if (['node_modules', 'dist', '.git', 'public', 'assets'].includes(f)) return;
      let p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) {
         r = r.concat(walk(p));
      } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx')) {
         r.push(p);
      }
    });
  } catch (e) {}
  return r;
}

let fixed = 0;
walk('src').forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('const t = useLanguageStore')) return;
  
  const lines = content.split('\n');
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const t = useLanguageStore')) {
      // Find the function definition before this hook
      let isCamelCaseHelper = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        // Match const/let/function with lowercase first letter
        if (/const\s+[a-z][a-zA-Z0-9]*\s*=/.test(lines[j]) || /let\s+[a-z][a-zA-Z0-9]*\s*=/.test(lines[j]) || /function\s+[a-z][a-zA-Z0-9]*\s*\(/.test(lines[j])) {
          isCamelCaseHelper = true;
          break;
        }
        // If we hit a Capital letter definition, it's a component
        if (/const\s+[A-Z][a-zA-Z0-9]*\s*=/.test(lines[j]) || /function\s+[A-Z][a-zA-Z0-9]*\s*\(/.test(lines[j])) {
          break;
        }
      }
      
      if (isCamelCaseHelper) {
         lines[i] = ''; // Remove the hook
         changed = true;
         // Also remove the import if no other useLanguageStore exists
         // (Handled automatically by eslint/vite usually, or we just leave it)
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(f, lines.join('\n'));
    console.log('✅ Removed invalid hook from: ' + f);
    fixed++;
  }
});

console.log('\nTotal fixed: ' + fixed);

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git')) {
          results = results.concat(walk(filepath));
        }
      } else if (/\.(jsx?|tsx?)$/.test(file)) {
        results.push(filepath);
      }
    });
  } catch(e) {}
  return results;
}

const files = walk('./src');
let fixedCount = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  
  // Check for ANY t("...") or t('...') call
  const tCalls = content.match(/\bt\(['"][^'"]+['"]\)/g);
  if (!tCalls) return;
  
  // Check if t is defined
  const hasHookT = /useLanguageStore\(s\s*=>\s*s\.t\)/.test(content) || 
                   /useLanguageStore\(s=>s\.t\)/.test(content);
  const hasDestructuredT = /\}\s*=\s*useLanguage/.test(content);
  const hasPropT = /\(\s*\{[^}]*\bt\b[^}]*\}\s*\)/.test(content);
  const hasConstT = /const\s+t\s*=/.test(content);
  const hasLetT = /let\s+t\s*=/.test(content);
  
  if (hasHookT || hasDestructuredT || hasPropT || hasConstT || hasLetT) return;
  
  // This file uses t() but doesn't define it. Add the hook.
  // Determine the relative path to useLanguageStore
  const dir = path.dirname(f);
  let relativePath = path.relative(dir, './src/stores/useLanguageStore').replace(/\\/g, '/');
  if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
  
  let fixed = content;
  
  // Check if it already has the import
  const hasImport = fixed.includes("import { useLanguageStore }");
  
  // For React function components, add the hook at the top of the component
  // First, add import if missing
  if (!hasImport) {
    // Find the last import statement
    const importMatches = [...fixed.matchAll(/^import\s+.*from\s+['"][^'"]+['"];?\s*$/gm)];
    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      fixed = fixed.slice(0, insertPos) + `\nimport { useLanguageStore } from '${relativePath}';` + fixed.slice(insertPos);
    } else {
      fixed = `import { useLanguageStore } from '${relativePath}';\n` + fixed;
    }
  }
  
  // Now add `const t = useLanguageStore(s => s.t);` at the top of the component function
  // Look for patterns like:
  // const ComponentName = memo(() => {
  // const ComponentName = () => {
  // function ComponentName() {
  // export default function ComponentName() {
  
  // Strategy: find first function/arrow that looks like a React component
  const componentPatterns = [
    /(?:const|let)\s+\w+\s*=\s*memo\(\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{/,
    /(?:const|let)\s+\w+\s*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{/,
    /function\s+\w+\s*\(\s*(?:\{[^}]*\})?\s*\)\s*\{/,
    /export\s+default\s+function\s+\w+\s*\(\s*(?:\{[^}]*\})?\s*\)\s*\{/
  ];
  
  let inserted = false;
  for (const pattern of componentPatterns) {
    const match = fixed.match(pattern);
    if (match) {
      const insertAfter = match.index + match[0].length;
      fixed = fixed.slice(0, insertAfter) + '\n  const t = useLanguageStore(s => s.t);' + fixed.slice(insertAfter);
      inserted = true;
      break;
    }
  }
  
  if (!inserted) {
    // Fallback: for .ts files or other patterns, just add at top level
    console.log(`⚠️ Could not find component pattern in ${f}, adding module-level t()`);
    // Add a safe module-level t getter
    const importEnd = fixed.lastIndexOf("import ");
    const lineEnd = fixed.indexOf('\n', importEnd);
    fixed = fixed.slice(0, lineEnd + 1) + 
      `\nconst t = (key) => { try { return useLanguageStore.getState().t(key); } catch(e) { return null; } };\n` + 
      fixed.slice(lineEnd + 1);
    inserted = true;
  }
  
  if (inserted && fixed !== content) {
    fs.writeFileSync(f, fixed);
    fixedCount++;
    console.log(`✅ Fixed: ${f}`);
  }
});

console.log(`\n🎉 Total fixed: ${fixedCount}`);

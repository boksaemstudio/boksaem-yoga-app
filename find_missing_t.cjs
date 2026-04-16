const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      results = results.concat(walkDir(fullPath));
    } else if (/\.(jsx?|tsx?)$/.test(file) && !file.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, 'src');
const files = walkDir(srcDir);

console.log('=== Files using t() but NOT importing useLanguage/useLanguageStore ===\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const basename = path.basename(file);
  
  // Skip the stores and hooks themselves
  if (basename === 'useLanguageStore.js' || basename === 'useLanguage.js' || basename === 'translations.js') continue;
  
  // Check if file uses t( pattern (as a function call, not part of other words)
  const usesTFunc = /\bt\s*\(/.test(content);
  if (!usesTFunc) continue;
  
  // Check if it imports useLanguageStore or useLanguage
  const hasImport = content.includes('useLanguageStore') || content.includes('useLanguage');
  
  if (!hasImport) {
    console.log(`MISSING IMPORT: ${path.relative(srcDir, file)}`);
    // Show lines with t( calls
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (/\bt\s*\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        console.log(`  L${i+1}: ${line.trim().substring(0, 120)}`);
      }
    });
    console.log('');
  }
}

console.log('\n=== Files using t() OUTSIDE of function/component body ===\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const basename = path.basename(file);
  if (basename === 'useLanguageStore.js' || basename === 'useLanguage.js' || basename === 'translations.js') continue;
  
  const lines = content.split('\n');
  let insideFunction = 0;
  let insideComponent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track function/component depth (simple heuristic)
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    
    // Check if this is a top-level declaration with t()
    if (i < 20 && /\bt\s*\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('import')) {
      console.log(`TOP-LEVEL t() in ${path.relative(srcDir, file)}`);
      console.log(`  L${i+1}: ${line.trim().substring(0, 120)}`);
      console.log('');
    }
  }
}

// Also look for module-scope arrays/objects with t() calls
console.log('\n=== Module-scope constants using t() ===\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const basename = path.basename(file);
  if (basename === 'useLanguageStore.js' || basename === 'useLanguage.js' || basename === 'translations.js') continue;
  
  // Find patterns like: const X = [ ... t(' ... ] at module level
  // or const X = { ... t(' ... } at module level  
  const moduleConstRegex = /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*[\[{]/gm;
  let match;
  while ((match = moduleConstRegex.exec(content)) !== null) {
    const startIdx = match.index;
    const lineNum = content.substring(0, startIdx).split('\n').length;
    
    // Check if this is likely at module level (before any function declarations)
    // and contains t() calls
    let braceCount = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length && i < startIdx + 2000; i++) {
      if (content[i] === '{' || content[i] === '[') braceCount++;
      if (content[i] === '}' || content[i] === ']') braceCount--;
      if (braceCount === 0) { endIdx = i; break; }
    }
    
    const block = content.substring(startIdx, endIdx + 1);
    if (/\bt\s*\(/.test(block) && block.length < 1500) {
      console.log(`MODULE-SCOPE t() in ${path.relative(srcDir, file)} at L${lineNum}:`);
      console.log(`  ${match[0].trim().substring(0, 100)}...`);
      // Show the t() calls within
      block.split('\n').forEach((l, idx) => {
        if (/\bt\s*\(/.test(l)) {
          console.log(`  L${lineNum + idx}: ${l.trim().substring(0, 120)}`);
        }
      });
      console.log('');
    }
  }
}

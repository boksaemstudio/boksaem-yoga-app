const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.jsx');
let fixedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('useLanguageStore(s => s.t)') && content.includes('useMemo')) {
    // 1. Change `const t = useLanguageStore(s => s.t);` to `const { t, language } = useLanguageStore();`
    let newContent = content.replace(/const\s+t\s*=\s*useLanguageStore\(\s*s\s*=>\s*s\.t\s*\)\s*;/g, 'const { t, language } = useLanguageStore();');
    
    // 2. Add `language` to useMemo dependencies: `}, [foo, bar]);` -> `}, [foo, bar, language]);`
    if (newContent !== content) {
      newContent = newContent.replace(/\},\s*\[(.*?)\]\)/g, (match, deps) => {
        if (!deps.includes('language')) {
           return `}, [${deps ? deps + ', ' : ''}language])`;
        }
        return match;
      });
      
      // Also catch useEffects and useCallbacks just to be safe if they use `t`
      fs.writeFileSync(f, newContent, 'utf8');
      fixedCount++;
      console.log('Fixed:', f);
    }
  }
});
console.log('Total fixed:', fixedCount);

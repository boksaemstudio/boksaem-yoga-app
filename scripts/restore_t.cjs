const fs = require('fs');

function findFiles(d) {
    let results = [];
    fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
        let p = d + '/' + e.name;
        if (e.isDirectory()) results = results.concat(findFiles(p));
        else if (e.name.endsWith('.jsx') || e.name.endsWith('.js')) {
            let c = fs.readFileSync(p, 'utf8');
            if (/\bt\s*\(/g.test(c)) {
                if (c.includes('useLanguageStore') && !c.includes('const t = useLanguageStore') && !c.includes('t = useLanguageStore') && !p.includes('useLanguage.') && !p.includes('useLanguageStore')) {
                    results.push(p);
                }
            }
        }
    });
    return results;
}

const files = findFiles('src');

files.forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    let lines = c.split('\n');
    let inserted = false;
    
    for (let i = 0; i < lines.length; i++) {
        if (/const\s+[A-Z][a-zA-Z0-9]*\s*=\s*/.test(lines[i]) || /function\s+[A-Z][a-zA-Z0-9]*/.test(lines[i]) || /const\s+[a-z][a-zA-Z0-9]*\s*=\s*\(.*?=>/.test(lines[i])) {
            for (let j = i; j < Math.min(i + 30, lines.length); j++) {
                if (lines[j].includes('{')) {
                    lines.splice(j + 1, 0, '  const t = useLanguageStore(s => s.t);');
                    inserted = true;
                    break;
                }
            }
        }
        if (inserted) break;
    }
    
    if (!inserted) {
         console.log('❌ Fallback insertion needed for:', f);
    } else {
        fs.writeFileSync(f, lines.join('\n'));
        console.log('✅ Restored hook to:', f);
    }
});

const fs = require('fs');
const path = require('path');

function walk(d) {
    fs.readdirSync(d).forEach(f => {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (p.endsWith('.jsx') || p.endsWith('.js')) {
            let c = fs.readFileSync(p, 'utf8');
            let m = c.match(/from\s+['"]([^'"]+)stores\/useLanguageStore['"]/);
            if (m) {
                let expectedRaw = path.relative(path.dirname(p), path.resolve('src/stores/useLanguageStore')).replace(/\\/g, '/');
                let expected = expectedRaw.startsWith('.') ? expectedRaw : './' + expectedRaw;
                let replaced = c.replace(m[0], "from '" + expected + "'");
                if (c !== replaced) {
                    fs.writeFileSync(p, replaced);
                    console.log('Fixed path in', p);
                }
            }
        }
    });
}
walk('src');

const fs = require('fs');
let ts = fs.readFileSync('src/utils/translations.js', 'utf8');
const objMatch = ts.replace('export const translations = ', '').trim().replace(/;$/, '');
let t = new Function('return ' + objMatch)();

for(let lang in t) {
  for(let key in t[lang]) {
    if (typeof t[lang][key] === 'string' && t[lang][key].includes('\\u')) {
      // The string in memory literally contains a backslash followed by 'u'
      // We can convert it to actual characters:
      t[lang][key] = t[lang][key].replace(/\\u([0-9a-fA-F]{4})/g, (m, grp) => String.fromCharCode(parseInt(grp, 16)));
    }
  }
}

// Add the 1693 keys to KO dictionary if missing
const missing = JSON.parse(fs.readFileSync('missing_g_keys.json', 'utf8'));
for(let key in missing) {
  if (!t.ko[key]) {
    // The missing JSON might have literal \\u too
    let val = missing[key];
    if (val.includes('\\u')) {
      val = val.replace(/\\u([0-9a-fA-F]{4})/g, (m, grp) => String.fromCharCode(parseInt(grp, 16)));
    }
    t.ko[key] = val;
  }
}

let newCode = 'export const translations = {\n' + Object.keys(t).map(lang => '  ' + lang + ': {\n' + Object.keys(t[lang]).map(k => '    ' + (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + JSON.stringify(t[lang][k])).join(',\n') + '\n  }').join(',\n') + '\n};\n';

fs.writeFileSync('src/utils/translations.js', newCode, 'utf8');
console.log('Cleaned translations.js');

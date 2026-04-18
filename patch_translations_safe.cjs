const fs = require('fs');
let ts = fs.readFileSync('src/utils/translations.js', 'utf8');
const objMatch = ts.replace('export const translations = ', '').trim().replace(/;$/, '');
let t = new Function('return ' + objMatch)();

// Add missing keys to ko
const missing = JSON.parse(fs.readFileSync('missing_g_keys.json', 'utf8'));
for(let key in missing) {
  if (!t.ko[key]) {
    t.ko[key] = missing[key];
  }
}

// Fix year month format
for(let lang in t) {
  if(lang==='ko') t[lang]['g_year_month_format'] = '{year}년 {month}월';
  else if(['ja','zh'].includes(lang)) t[lang]['g_year_month_format'] = '{year}年 {month}月';
  else t[lang]['g_year_month_format'] = '{month}/{year}';
}

// Fix "명" mapping in en
['명', 'g_5a62fd', 'g_7b3c6e', 'g_8038a0'].forEach(k => {
  if (t.en[k]) t.en[k] = ' people';
});

// We DO NOT manually replace \uXXXX inside strings because JSON.stringify does it correctly!
// Actually, `JSON.stringify` escapes control characters but leaves normal Unicode characters intact!
// Wait! If the original string had `\\uACF5` (two backslashes), `JSON.stringify` will escape the backslash to `\\\\uACF5`!
// To fix the double backslashes, we MUST decode them FIRST.
// BUT we MUST NOT decode `\u0022` (quote) or `\n` (`\u000a`). We should ONLY decode Korean characters!
for (let lang in t) {
  for (let key in t[lang]) {
    if (typeof t[lang][key] === 'string' && t[lang][key].includes('\\u')) {
      t[lang][key] = t[lang][key].replace(/\\u([0-9a-fA-F]{4})/g, (m, grp) => {
        const code = parseInt(grp, 16);
        // Only decode Korean characters (Hangul Syllables 0xAC00-0xD7A3, Jamo, etc.) to avoid breaking JS syntax
        if (code >= 0xAC00 && code <= 0xD7A3 || code >= 0x3130 && code <= 0x318F) {
          return String.fromCharCode(code);
        }
        return m; // keep original escape for others
      });
    }
  }
}

let newCode = 'export const translations = {\n' + Object.keys(t).map(lang => '  ' + lang + ': {\n' + Object.keys(t[lang]).map(k => '    ' + (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + JSON.stringify(t[lang][k])).join(',\n') + '\n  }').join(',\n') + '\n};\n';

fs.writeFileSync('src/utils/translations.js', newCode, 'utf8');
console.log('Fixed translations.js safely!');

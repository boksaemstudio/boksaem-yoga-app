const fs = require('fs');
let ts = fs.readFileSync('src/utils/translations.js', 'utf8');
const objMatch = ts.replace('export const translations = ', '').trim().replace(/;$/, '');
let t = new Function('return ' + objMatch)();
for(let lang in t) {
  if(lang==='ko') t[lang]['g_year_month_format'] = '{year}년 {month}월';
  else if(['ja','zh'].includes(lang)) t[lang]['g_year_month_format'] = '{year}年 {month}月';
  else t[lang]['g_year_month_format'] = '{month}/{year}';
}
let newCode = 'export const translations = {\n' + Object.keys(t).map(lang => '  ' + lang + ': {\n' + Object.keys(t[lang]).map(k => '    ' + (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + JSON.stringify(t[lang][k])).join(',\n') + '\n  }').join(',\n') + '\n};\n';
fs.writeFileSync('src/utils/translations.js', newCode, 'utf8');
console.log('Done patching year_month_format');

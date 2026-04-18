const fs = require('fs');
const { translations } = require('./src/utils/translations.js');

// 1. Add missing keys to ko
const missing = JSON.parse(fs.readFileSync('missing_g_keys.json', 'utf8'));
for(let key in missing) {
  if (!translations.ko[key]) {
    translations.ko[key] = missing[key];
  }
}

// 2. Fix year month format
for(let lang in translations) {
  if(lang==='ko') translations[lang]['g_year_month_format'] = '{year}년 {month}월';
  else if(['ja','zh'].includes(lang)) translations[lang]['g_year_month_format'] = '{year}年 {month}月';
  else translations[lang]['g_year_month_format'] = '{month}/{year}';
}

// 3. Fix "명" mapping in English
['명', 'g_5a62fd', 'g_7b3c6e', 'g_8038a0'].forEach(k => {
  if (translations.en[k]) translations.en[k] = ' people';
});

// 4. Fix teacher suffix
for(let lang in translations) {
  if(lang === 'ko') {
    translations[lang]['inst_page_teacher_suffix'] = '선생님';
    translations[lang]['g_620be2'] = '선생님';
    translations[lang]['g_dbf32d'] = '선생님';
    translations[lang]['inst_page_teacher'] = '선생님';
  } else if (['ja', 'zh'].includes(lang)) {
    translations[lang]['inst_page_teacher_suffix'] = '先生';
    translations[lang]['g_620be2'] = '先生';
    translations[lang]['g_dbf32d'] = '先生';
    translations[lang]['inst_page_teacher'] = '先生';
  } else {
    translations[lang]['inst_page_teacher_suffix'] = '';
    translations[lang]['g_620be2'] = '';
    translations[lang]['g_dbf32d'] = '';
    translations[lang]['inst_page_teacher'] = '';
  }
}

// We DO NOT manually replace \uXXXX inside strings!
// If we write out the Javascript properly, we don't need to manually decode \uXXXX.
// The literal '\uACF5' strings in `translations.js` evaluate to proper Unicode characters when `require`d.
// Therefore, `translations` object NOW contains the decoded, proper Unicode strings!
// When we write them back using `JSON.stringify()`, `JSON.stringify()` will output actual Unicode characters natively (since they are not control characters).
// It will only escape `\n`, `\"`, `\\`, etc., which is perfectly valid!

let newCode = 'export const translations = {\n' + 
  Object.keys(translations).map(lang => 
    '  ' + lang + ': {\n' + 
    Object.keys(translations[lang]).map(k => 
      '    ' + (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + JSON.stringify(translations[lang][k])
    ).join(',\n') + '\n  }'
  ).join(',\n') + '\n};\n';

fs.writeFileSync('src/utils/translations.js', newCode, 'utf8');
console.log('Fixed translations.js safely!');

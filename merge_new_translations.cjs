const fs = require('fs');

const filePath = 'src/utils/translations.js';
let code = fs.readFileSync(filePath, 'utf8');

const extracted = JSON.parse(fs.readFileSync('extracted_ko.json', 'utf8'));

const koStart = code.indexOf('ko: {');
if (koStart !== -1) {
    let injection = '\n';
    // To prevent duplicates, we can check if the key already exists
    // actually, our extracted JSON contains all of them.
    for (const [k, v] of Object.entries(extracted)) {
        if (!code.includes(`"${k}":`)) {
            // handle multiline or quotes in the value by stringifying safely
            injection += `        "${k}": ${JSON.stringify(v)},\n`;
        }
    }
    
    code = code.substring(0, koStart + 5) + injection + code.substring(koStart + 5);
    fs.writeFileSync(filePath, code);
    console.log('Successfully merged ' + Object.keys(extracted).length + ' extracted translations.');
} else {
    console.error('Could not find ko: { block');
}

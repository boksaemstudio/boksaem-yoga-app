const fs = require('fs');
let c = fs.readFileSync('src/utils/translations.js', 'utf8');
c = c.replace(/\\n/g, '\n');
fs.writeFileSync('src/utils/translations.js', c, 'utf8');
console.log('Fixed newlines');

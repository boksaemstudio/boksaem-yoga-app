const fs = require('fs');
const path = require('path');

const dirs = ['en', 'ja', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'in', 'au', 'ca'];
for (const dir of dirs) {
    const file = path.join('public', dir, 'home.html');
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if missing container regex
    const regex = /(<section class="features" id="features"[^>]*>)\s*<div class="sympathy-box"/;
    
    if (regex.test(content)) {
        content = content.replace(regex, `$1\n        <div class="container">\n            <div class="sympathy-box"`);
        fs.writeFileSync(file, content);
        console.log(`Fixed missing <div class="container"> in ${dir}/home.html`);
    } else {
        console.log(`Could not find the broken signature in ${dir}/home.html`);
    }
}

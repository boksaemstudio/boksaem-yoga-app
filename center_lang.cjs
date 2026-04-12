const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const files = [];

function findFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath);
        } else if (item === 'home.html') {
            files.push(fullPath);
        }
    }
}

findFiles(publicDir);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Make sure navbar has position:relative
    if (content.includes('<nav class="navbar glass">')) {
        content = content.replace('<nav class="navbar glass">', '<nav class="navbar glass" style="position: relative;">');
    }

    // Try multiple regexes to match the block
    const langBtnRegex1 = /<div[^>]*margin-left:16px[^>]*>[\s\S]*?(?:id="langDrop"|class="lang-dropdown")[\s\S]*?<\/div>\s*<\/div>/;
    const langBtnRegex2 = /<div class="lang-switcher"[^>]*>[\s\S]*?(?:id="langDrop"|class="lang-dropdown")[\s\S]*?<\/div>\s*<\/div>/;

    let match = content.match(langBtnRegex1) || content.match(langBtnRegex2);

    if (match) {
        let blockStr = match[0];
        
        // Remove it from its current location
        content = content.replace(blockStr, '');

        // Now modify blockStr to be centered
        let newBlockStr = blockStr.replace(/<div(?:[^>]*? margin-left:16px[^>]*?| class="lang-switcher"[^>]*?)>/, '<div class="lang-switcher" style="position:absolute; left:50%; transform:translateX(-50%); display:flex; align-items:center; z-index: 100;">');

        newBlockStr = newBlockStr.replace(/right:\s*0\s*;/g, '');
        newBlockStr = newBlockStr.replace(/right:0;/g, '');
        newBlockStr = newBlockStr.replace(/right:0/g, '');

        if (newBlockStr.includes('id="langDrop"')) {
            newBlockStr = newBlockStr.replace('min-width:160px;', 'min-width:160px; left:50%; transform:translateX(-50%);');
        } else {
             newBlockStr = newBlockStr.replace('class="lang-dropdown"', 'class="lang-dropdown" style="left:50%; transform:translateX(-50%); right:auto;"');
        }

        // Insert new block before <div class="nav-links" id="navLinks">
        const navLinksIdx = content.indexOf('<div class="nav-links" id="navLinks">');
        if (navLinksIdx !== -1) {
            content = content.slice(0, navLinksIdx) + '\n        <!-- Centered Lang Switcher -->\n        ' + newBlockStr + '\n        ' + content.slice(navLinksIdx);
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`Could not find lang switcher in ${file}`);
    }
}

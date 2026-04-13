const fs = require('fs');
const path = require('path');

// Find all public/**/home.html files
const publicDir = 'public';
const langDirs = fs.readdirSync(publicDir).filter(f => {
    const fullPath = path.join(publicDir, f);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'home.html'));
});

let fixed = 0;
langDirs.forEach(lang => {
    const filePath = path.join(publicDir, lang, 'home.html');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add notranslate if missing
    if (!content.includes('notranslate')) {
        content = content.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    <meta name="google" content="notranslate">');
        fs.writeFileSync(filePath, content, 'utf8');
        fixed++;
        console.log(`[FIXED] ${filePath} - Added notranslate meta tag`);
    } else {
        console.log(`[OK] ${filePath} - Already has notranslate`);
    }
});

// Also check main home.html
const mainHome = path.join(publicDir, 'home.html');
if (fs.existsSync(mainHome)) {
    let content = fs.readFileSync(mainHome, 'utf8');
    if (!content.includes('notranslate')) {
        content = content.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    <meta name="google" content="notranslate">');
        fs.writeFileSync(mainHome, content, 'utf8');
        fixed++;
        console.log(`[FIXED] ${mainHome} - Added notranslate meta tag`);
    } else {
        console.log(`[OK] ${mainHome} - Already has notranslate`);
    }
}

// Check features.html
const featuresHtml = path.join(publicDir, 'features.html');
if (fs.existsSync(featuresHtml)) {
    let content = fs.readFileSync(featuresHtml, 'utf8');
    if (!content.includes('notranslate')) {
        content = content.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    <meta name="google" content="notranslate">');
        fs.writeFileSync(featuresHtml, content, 'utf8');
        fixed++;
        console.log(`[FIXED] ${featuresHtml} - Added notranslate meta tag`);
    } else {
        console.log(`[OK] ${featuresHtml} - Already has notranslate`);
    }
}

console.log(`\nTotal fixed: ${fixed} files`);
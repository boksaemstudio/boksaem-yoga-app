const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, files);
        } else if (fullPath.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = getFiles('public');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Remove hardcoded production URLs for organic local testing and dynamic routing
    if (content.includes('href="https://passflowai.web.app/')) {
        content = content.replace(/href="https:\/\/passflowai\.web\.app\//g, 'href="/');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Patched URL in:', file);
    }
});

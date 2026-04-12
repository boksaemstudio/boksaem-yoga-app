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

    // Fix the duplicate style error and add consistent styling for all a tags inside lang-dropdown
    // We will find the lang-dropdown wrapper
    const wrapperMatch = content.match(/<(div)[^>]*id="langDrop"[^>]*>([\s\S]*?)<\/\1>/)
                      || content.match(/<(div)[^>]*class="lang-dropdown"[^>]*>([\s\S]*?)<\/\1>/);

    if (wrapperMatch) {
        const innerHTML = wrapperMatch[2];
        let newInnerHTML = innerHTML;

        // Replace all <a> tags with standardized styling
        // First match the href and text.
        // E.g., <a href="/home.html" ...>🇰🇷 한국어</a>
        
        let linkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        newInnerHTML = newInnerHTML.replace(linkRegex, (match, href, text) => {
            // Check if this should be the active link. The logic is based on the file path
            // e.g., if file ends with \en\home.html, href="/en/home.html" should be active
            let relativePath = file.substring(publicDir.length).replace(/\\/g, '/');
            if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;
            // e.g. relativePath is "/home.html" or "/en/home.html"

            const isActive = (href === relativePath) || (href === relativePath.replace('home.html', ''));
            
            // Re-construct the inline style cleanly.
            let style = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;transition:0.2s;';
            if (isActive) {
                style += 'color:#d4af37;font-weight:700;background:rgba(212,175,55,0.1);';
            } else {
                style += 'color:rgba(255,255,255,0.85);';
            }

            // On mouse over we can't do inline hover easily without js or classes, but CSS classes are safer.
            // Since we use inline mostly, we will inject a class "lang-dropdown-link" and also keep inline style as fallback.
            return `<a href="${href}" class="lang-dropdown-link${isActive ? ' active' : ''}" style="${style}" onmouseover="this.style.color='#d4af37';this.style.background='rgba(212,175,55,0.1)';" onmouseout="this.style.color='${isActive ? '#d4af37' : 'rgba(255,255,255,0.85)'}';this.style.background='${isActive ? 'rgba(212,175,55,0.1)' : 'transparent'}';">${text}</a>`;
        });

        content = content.replace(innerHTML, newInnerHTML);
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed links in ${file}`);
    } else {
        console.log(`Could not find lang dropdown in ${file}`);
    }
}

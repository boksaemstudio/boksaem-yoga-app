const fs = require('fs');
const path = require('path');

const pub = p => path.join(__dirname, '..', 'public', p);
const filesToUpdate = ['home.html'];
const langs = ['en', 'ja', 'zh', 'ru', 'es', 'pt', 'fr', 'de', 'in', 'au', 'ca'];
for (const lang of langs) {
  filesToUpdate.push(`${lang}/home.html`);
}

const naverTag = '<meta name="naver-site-verification" content="4070bbb12ed48b6f675fa0738d94c12500889b74" />';

let count = 0;
for (const rel of filesToUpdate) {
  const fullPath = pub(rel);
  if (!fs.existsSync(fullPath)) continue;
  
  let html = fs.readFileSync(fullPath, 'utf8');
  if (!html.includes('naver-site-verification')) {
    html = html.replace('</title>', '</title>\n    ' + naverTag);
    fs.writeFileSync(fullPath, html, 'utf8');
    count++;
  }
}
console.log(`✅ Injected Naver Site Verification tag into ${count} files.`);

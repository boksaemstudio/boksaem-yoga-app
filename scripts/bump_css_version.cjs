const fs = require('fs');
const path = require('path');

function bumpCssVersion() {
  const publicDir = path.join(__dirname, '..', 'public');
  const filesToUpdate = ['home.html'];
  const langs = ['en', 'ja', 'zh', 'ru', 'es', 'pt', 'fr', 'de', 'in', 'au', 'ca'];
  
  for (const lang of langs) {
    filesToUpdate.push(`${lang}/home.html`);
  }

  let count = 0;
  for (const relPath of filesToUpdate) {
    const fullPath = path.join(publicDir, relPath);
    if (!fs.existsSync(fullPath)) continue;

    let html = fs.readFileSync(fullPath, 'utf8');
    // style.css?v=6 또는 다른 버전 번호가 있는지 확인하고 v=7로 강제 업데이트
    if (html.includes('style.css?v=')) {
      html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=7');
      fs.writeFileSync(fullPath, html, 'utf8');
      count++;
      console.log(`✅ Cache Invalidated: ${relPath}`);
    }
  }
  console.log(`\n완료: 총 ${count}개 파일의 CSS 캐시 버전을 v=7로 강제 업데이트 (근본적 캐시 무효화)`);
}

bumpCssVersion();

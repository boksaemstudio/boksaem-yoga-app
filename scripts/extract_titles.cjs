// 각 비영어권 파일에서 3개 카드 실제 텍스트 추출
const fs = require('fs');
const langs = ['es','pt','fr','de','zh','ru','in'];
for (const l of langs) {
  const h = fs.readFileSync(`public/${l}/home.html`, 'utf8');
  // h3 태그들 추출
  const titles = h.match(/<h3[^>]*>([^<]+)<\/h3>/g) || [];
  const featureTitles = titles.slice(0, 6).map(t => t.replace(/<[^>]+>/g, '').trim());
  console.log(`\n[${l.toUpperCase()}] 제목들:`);
  featureTitles.forEach((t, i) => console.log(`  ${i}: ${t}`));
  
  // emoji 카드 찾기
  const cards = h.match(/👋|🎫|📉/g);
  console.log(`  이모지: ${cards ? cards.join(' ') : '없음'}`);
}

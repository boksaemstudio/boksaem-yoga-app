const fs = require('fs');
const pages = [
  'public/en/home.html',
  'public/ja/home.html',
  'public/in/home.html',
  'public/home.html'
];
const replacements = [
  ['demo_admin.png', 'demo_admin.webp'],
  ['demo_checkin.png', 'demo_checkin.webp'],
  ['demo_member.png', 'demo_member.webp'],
  ['demo_instructor.png', 'demo_instructor.webp'],
  ['empathy_illustration.png', 'empathy_illustration.webp'],
  ['gamification.png', 'gamification.webp'],
  ['owner_ai_predict.png', 'owner_ai_predict.webp'],
  ['feature_checkin_real.png', 'feature_checkin_real.webp'],
  ['feature_dashboard_real.png', 'feature_dashboard_real.webp'],
  ['feature_automation_real.png', 'feature_automation_real.webp'],
  ['hero_features_ai_meeting_bg.png', 'hero_features_ai_meeting_bg.webp'],
  ['passflow_ai_logo_transparent.png', 'passflow_ai_logo_transparent.webp'],
];

for (const p of pages) {
  if (!fs.existsSync(p)) { console.log('SKIP:', p); continue; }
  let html = fs.readFileSync(p, 'utf8');
  let count = 0;
  for (const [from, to] of replacements) {
    const re = new RegExp(from.replace(/\./g, '\\.'), 'g');
    const matches = html.match(re);
    if (matches) {
      count += matches.length;
      html = html.replace(re, to);
    }
  }
  fs.writeFileSync(p, html);
  console.log(p, count, 'images replaced');
}

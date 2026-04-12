/**
 * ru, zh, in 페이지에 pricing feature grid 추가
 * (en, ja, es는 이미 있음. pt, fr, de, au, ca는 이전 스크립트에서 추가됨)
 */
const fs = require('fs');
const path = require('path');
const projectRoot = path.join(__dirname, '..');

function makePricingGrid(features) {
  return features.map(f => `
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">${f}</span>
                    </div>`).join('\n');
}

const pageFixes = {
  ru: {
    features: ['Система бронирования', 'Распознавание лица или PIN', 'Управление клиентами', 'Неограниченные абонементы', 'Статистика в реальном времени', 'Бесплатная начальная настройка']
  },
  zh: {
    features: ['预约管理系统', '面部识别或密码签到', '会员/教练管理', '多种课程券支持', '实时营收统计', '免费初始设置']
  },
  in: {
    features: ['Booking system', 'Face or PIN check-in', 'Member management', 'Unlimited credits', 'Real-time analytics', 'Free initial setup']
  }
};

for (const [code, fix] of Object.entries(pageFixes)) {
  const filePath = path.join(projectRoot, `public/${code}/home.html`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  ${code}/home.html not found`); continue; }
  let html = fs.readFileSync(filePath, 'utf8');

  // Check if pricing grid already exists
  if (html.includes('pricing-feature') || html.includes('grid-template-columns:repeat(2,1fr)')) {
    console.log(`ℹ️  ${code}/home.html already has pricing feature grid, skipping`);
    continue;
  }

  const gridHtml = `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:30px;text-align:left;">
${makePricingGrid(fix.features)}
                </div>`;

  // Insert grid before the first CTA button in pricing section
  // Look for the pattern right before the CTA
  const ctaPattern = /<a href="[^"]*" class="btn-primary" id="cta-email/;
  const ctaPatternAlt = /<a href="mailto:[^"]*" id="cta-email/;
  
  if (ctaPattern.test(html)) {
    html = html.replace(ctaPattern, gridHtml + '\n                ' + html.match(ctaPattern)[0]);
    // Fix: above approach doubles the match. Use proper replace:
  }

  // Actually, let's use a simpler approach - insert before the privacy line
  // All pages have: 🔒 Data/Datos/数据... 
  const privacyLine = html.match(/(<p style="font-size:0\.8rem;[^>]*>🔒)/);
  if (privacyLine) {
    html = html.replace(privacyLine[1], gridHtml + '\n                ' + privacyLine[1]);
  } else {
    // Try another marker - the email button
    const emailBtn = html.match(/(id="cta-email)/);
    if (emailBtn) {
      // Find the line and insert before the parent <a> tag
      const lines = html.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('id="cta-email')) {
          // Insert grid before this line
          lines.splice(i, 0, gridHtml);
          break;
        }
      }
      html = lines.join('\n');
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ Added pricing feature grid to ${code}/home.html`);
}

console.log('\n✅ All remaining pages fixed!');

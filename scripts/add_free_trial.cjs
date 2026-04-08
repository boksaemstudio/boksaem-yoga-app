const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

const trialTexts = {
  ru: { badge: '🎁 2 месяца бесплатно', subtitle: '⏰ Попробуйте бесплатно 2 месяца. Без привязки карты.', cta: '🚀 Начать бесплатный период' },
  zh: { badge: '🎁 2个月免费试用', subtitle: '⏰ 先免费试用2个月再决定。无需绑卡。', cta: '🚀 开始2个月免费试用' },
  es: { badge: '🎁 2 meses gratis', subtitle: '⏰ Pruébalo gratis 2 meses. Sin tarjeta de crédito.', cta: '🚀 Empezar prueba gratuita' },
  pt: { badge: '🎁 2 meses grátis', subtitle: '⏰ Experimente grátis por 2 meses. Sem cartão de crédito.', cta: '🚀 Iniciar teste gratuito' },
  fr: { badge: '🎁 2 mois gratuits', subtitle: '⏰ Essayez gratuitement pendant 2 mois. Sans carte bancaire.', cta: '🚀 Commencer l\'essai gratuit' },
  de: { badge: '🎁 2 Monate kostenlos', subtitle: '⏰ 2 Monate kostenlos testen. Keine Kreditkarte erforderlich.', cta: '🚀 Kostenlos testen' },
  au: { badge: '🎁 2-Month Free Trial', subtitle: '⏰ Try it free for 2 months. No credit card required.', cta: '🚀 Start Your Free Trial' },
  ca: { badge: '🎁 2-Month Free Trial', subtitle: '⏰ Try it free for 2 months. No credit card required.', cta: '🚀 Start Your Free Trial' },
  ja: { badge: '🎁 2ヶ月無料体験', subtitle: '⏰ まず2ヶ月無料でお試しください。クレジットカード不要。', cta: '🚀 2ヶ月無料で始める' },
  in: { badge: '🎁 2-Month Free Trial', subtitle: '⏰ Try it free for 2 months. No credit card required.', cta: '🚀 Start Your Free Trial' },
};

const langs = Object.keys(trialTexts);
let updated = 0;

for (const lang of langs) {
  const filePath = path.join(projectRoot, 'public', lang, 'home.html');
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filePath} not found`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  const t = trialTexts[lang];

  // Already has free trial badge?
  if (html.includes('pulse 2s')) {
    console.log(`SKIP: ${lang}/home.html already has free trial badge`);
    continue;
  }

  // Insert free trial badge before "All-in-One" text
  const allInOneRegex = /(<div[^>]*>All-in-One Plan<\/div>)/i;
  if (allInOneRegex.test(html)) {
    const badge = `<div style="text-align:center; margin-bottom: 16px;">
                    <span style="display:inline-block; padding:8px 24px; border-radius:40px; background:linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.05)); border:1px solid rgba(74,222,128,0.4); color:#4ade80; font-weight:800; font-size:1rem; animation: pulse 2s ease-in-out infinite;">${t.badge}</span>
                </div>
                <style>@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }</style>
                `;
    html = html.replace(allInOneRegex, badge + '$1');
  }

  // Add subtitle after the monthly cost line (find the line with "숨겨진" or "month" or similar)
  const monthlyLineRegex = /(<p[^>]*>.*?(?:month|mes|mois|Monat|月|месяц|월).*?<\/p>)/i;
  if (monthlyLineRegex.test(html)) {
    const trialLine = `\n                <p style="font-size: 1rem; color: #4ade80; font-weight: 700; margin-bottom: 24px;">${t.subtitle}</p>`;
    html = html.replace(monthlyLineRegex, '$1' + trialLine);
  }

  // Update CTA button: change mailto to onboarding with green styling
  const mailtoRegex = /(href="mailto:[^"]*"[^>]*class="btn-primary"[^>]*style="[^"]*background:\s*linear-gradient\(135deg,#d4af37[^"]*")/;
  if (mailtoRegex.test(html)) {
    html = html.replace(mailtoRegex, (match) => {
      return match
        .replace(/href="mailto:[^"]*"/, `href="/onboarding?lang=${lang}"`)
        .replace(/background:\s*linear-gradient\(135deg,#d4af37[^;]*;/, 'background: linear-gradient(135deg,#4ade80,#22c55e);')
        .replace(/box-shadow:[^;]*;/, 'box-shadow: 0 4px 20px rgba(74,222,128,0.3);');
    });
  }

  // Update CTA text
  const ctaTextRegex = />(📧[^<]*|Get Started[^<]*|Начать[^<]*|开始[^<]*|Empezar[^<]*|Iniciar[^<]*|Commencer[^<]*|Jetzt starten[^<]*|始める[^<]*|お問い合わせ[^<]*)<\/a>/;
  if (ctaTextRegex.test(html)) {
    html = html.replace(ctaTextRegex, `>${t.cta}</a>`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  updated++;
  console.log(`✅ Updated: ${lang}/home.html with free trial messaging`);
}

console.log(`\nDone! Updated ${updated} pages.`);

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const files = [
  'home.html', // KR
  'en/home.html', // US
  'ja/home.html',
  'ru/home.html',
  'zh/home.html',
  'es/home.html',
  'pt/home.html',
  'fr/home.html',
  'de/home.html',
  'in/home.html',
  'au/home.html',
  'ca/home.html'
];

// Helper to remove the targeted string (hero sub-copy)
const replacements = {
  'home.html': '출석체크, 수강권 차감, 예약 관리를 한 번에 해결하는 ',
  'en/home.html': 'AI check-in, booking, member management — all in one. ',
  'es/home.html': 'Check-in con IA, reservas, gestión de socios — todo en uno. ',
  'ja/home.html': 'AI顔認証チェックイン、予約、会員管理など、必要な機能がすべて揃っています。',
  'ru/home.html': 'AI-чек-ин, онлайн-запись, CRM для клиентов — всё необходимое в одном месте. ',
  'zh/home.html': 'AI刷脸签到、预约、会员CRM——满足您的所有需求。',
  'in/home.html': 'AI check-in, booking, member management — all in one. '
};

// Target dropdown HTML string to inject into all files
function getLangDropdownStr(currentPath) {
  const isCode = (baseCode) => currentPath === (baseCode === 'ko' ? 'home.html' : `${baseCode}/home.html`);
  return `
                    <a href="/home.html"${isCode('ko')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇰🇷 한국어</a>
                    <a href="/en/home.html"${isCode('en')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇺🇸 English (US)</a>
                    <a href="/ja/home.html"${isCode('ja')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇯🇵 日本語</a>
                    <a href="/ru/home.html"${isCode('ru')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇷🇺 Русский</a>
                    <a href="/zh/home.html"${isCode('zh')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇨🇳 中文</a>
                    <a href="/es/home.html"${isCode('es')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇪🇸 Español</a>
                    <a href="/pt/home.html"${isCode('pt')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇧🇷 Português</a>
                    <a href="/fr/home.html"${isCode('fr')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇫🇷 Français</a>
                    <a href="/de/home.html"${isCode('de')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇩🇪 Deutsch</a>
                    <a href="/in/home.html"${isCode('in')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇮🇳 India (EN)</a>
                    <a href="/au/home.html"${isCode('au')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇦🇺 Australia</a>
                    <a href="/ca/home.html"${isCode('ca')?' class="active" style="color:#d4af37;font-weight:600;"':''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;font-size:0.9rem;">🇨🇦 Canada</a>`;
}

// First, fix the generator script for others
const genScriptPath = path.join(__dirname, 'generate_landing_pages.cjs');
if (fs.existsSync(genScriptPath)) {
  let gContent = fs.readFileSync(genScriptPath, 'utf8');
  // Remove "Check-in com IA..." etc.
  gContent = gContent.replace('Check-in com IA, agendamentos, gestão de alunos — tudo em um só lugar. ', '');
  gContent = gContent.replace('Check-in IA, réservations, gestion clients — tout-en-un. ', '');
  gContent = gContent.replace('KI-Check-in, Buchungen, Mitgliederverwaltung — alles in einem. ', '');
  gContent = gContent.replace('AI check-in, booking, member management — all in one. ', '');
  gContent = gContent.replace('AI check-in, booking, member management — all in one. ', '');
  
  // also update langDropdown inside
  gContent = gContent.replace(/const langDropdown = \`[\s\S]*?\`;/, `const langDropdown = \`\${getLangDropdownStr(code+'/home.html')}\`;`);
  fs.writeFileSync(genScriptPath, gContent, 'utf8');
}

files.forEach(f => {
  const filePath = path.join(publicDir, f);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove hero string
  if (replacements[f]) {
    content = content.replace(replacements[f], '');
  }

  // Update language selector dropdown (between lang-dropdown or langDrop)
  content = content.replace(/(<div[^>]*class="lang-dropdown"[^>]*>|id="langDrop"[^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<button|\s*<\/div>\s*<\/div>\s*<button class="nav-hamburger")/m, (match, openTag, endTag) => {
    // Only replace what's inside the div, keeping the wrapper
    return `${openTag}${getLangDropdownStr(f)}\n                </div>\n            </div>\n        </div>\n        <button class="nav-hamburger"`;
  });

  // A different pass for standard public/home.html which uses "id='langDrop'"
  content = content.replace(/<div id="langDrop"[^>]*>[\s\S]*?<\/div>(\s*<\/div>\s*<\/div>\s*<button class="nav-hamburger")/m, (match, endTag) => {
    return `<div id="langDrop" style="position:absolute; top:calc(100% + 8px); right:0; min-width:160px; background:rgba(20,20,25,0.98); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:6px; display:none; z-index:1000; box-shadow:0 10px 40px rgba(0,0,0,0.6);">${getLangDropdownStr(f)}\n                </div>${endTag}`;
  });

  // Re-apply if style is missing `color:rgba(255,255,255,0.75)` for links (we applied it but wait let me just overwrite all the <a> styles specifically later, the generated ones are fine)

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('✅ Replaced hero sub-text and updated all language selectors.');

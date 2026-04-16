const fs = require('fs');
const path = require('path');

// All language directories + root (Korean)
const langs = [
  { dir: '', label: 'Korean (root)', expectedLang: 'ko' },
  { dir: 'en', label: 'English', expectedLang: 'en' },
  { dir: 'ja', label: 'Japanese', expectedLang: 'ja' },
  { dir: 'ru', label: 'Russian', expectedLang: 'ru' },
  { dir: 'zh', label: 'Chinese', expectedLang: 'zh' },
  { dir: 'es', label: 'Spanish', expectedLang: 'es' },
  { dir: 'pt', label: 'Portuguese', expectedLang: 'pt' },
  { dir: 'de', label: 'German', expectedLang: 'de' },
  { dir: 'fr', label: 'French', expectedLang: 'fr' },
  { dir: 'in', label: 'India', expectedLang: 'en' },
  { dir: 'au', label: 'Australia', expectedLang: 'en' },
  { dir: 'ca', label: 'Canada', expectedLang: 'en' },
];

const issues = [];

for (const lang of langs) {
  const filePath = lang.dir
    ? path.join('public', lang.dir, 'home.html')
    : path.join('public', 'home.html');

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${lang.label} (${filePath}) — FILE NOT FOUND`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  // Extract all href links that point to demo apps (admin, checkin, member, instructor)
  const linkRegex = /href="([^"]*(?:admin|checkin|member|instructor)[^"]*)"/gi;
  let match;
  const links = [];
  while ((match = linkRegex.exec(html)) !== null) {
    links.push({ href: match[1], position: match.index });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 ${lang.label} — ${filePath}`);
  console.log(`   Expected lang param: ${lang.expectedLang || '(none/ko)'}`);
  console.log(`   Found ${links.length} demo links:`);

  for (const link of links) {
    // Check what lang= param is in the URL
    const langMatch = link.href.match(/[?&]lang=([a-z]+)/i);
    const actualLang = langMatch ? langMatch[1] : '(none)';

    // Determine the app type
    let appType = 'unknown';
    if (link.href.includes('/admin')) appType = 'Admin';
    else if (link.href.includes('/checkin')) appType = 'Check-in';
    else if (link.href.includes('/member')) appType = 'Member';
    else if (link.href.includes('/instructor')) appType = 'Instructor';

    const isCorrect = (lang.expectedLang === 'ko' && actualLang === '(none)') ||
                      actualLang === lang.expectedLang;

    const status = isCorrect ? '✅' : '❌ WRONG';

    console.log(`   ${status} [${appType}] → lang=${actualLang} | ${link.href}`);

    if (!isCorrect) {
      issues.push({
        file: filePath,
        lang: lang.label,
        appType,
        expected: lang.expectedLang,
        actual: actualLang,
        href: link.href,
      });
    }
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`\n📊 AUDIT SUMMARY`);
console.log(`   Total issues found: ${issues.length}`);
if (issues.length > 0) {
  console.log('\n   Issues:');
  for (const issue of issues) {
    console.log(`   ❌ ${issue.lang} [${issue.appType}]: expected lang=${issue.expected}, got lang=${issue.actual}`);
    console.log(`      → ${issue.href}`);
  }
}

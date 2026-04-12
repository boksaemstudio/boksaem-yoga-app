/**
 * 모든 랜딩 페이지에 Google Ads 전환 추적 태그 추가
 * AW-878972747
 * 
 * 기존 GA4 gtag.js가 이미 로드되어 있으므로
 * gtag('config', 'AW-878972747') 한 줄만 추가
 */
const fs = require('fs');
const path = require('path');
const projectRoot = path.join(__dirname, '..');

const AW_ID = 'AW-878972747';
const allPages = [
  'home.html',           // Korean
  'en/home.html',
  'ja/home.html',
  'es/home.html',
  'ru/home.html',
  'zh/home.html',
  'in/home.html',
  'pt/home.html',
  'fr/home.html',
  'de/home.html',
  'au/home.html',
  'ca/home.html'
];

let updated = 0;
let skipped = 0;

for (const page of allPages) {
  const filePath = path.join(projectRoot, 'public', page);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  ${page} not found`); continue; }
  
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Already has AW tag?
  if (html.includes(AW_ID)) {
    console.log(`ℹ️  ${page} - already has ${AW_ID}, skipping`);
    skipped++;
    continue;
  }
  
  // Find the GA4 config line and add AW config after it
  // Pattern: gtag('config', 'G-3D6011MNHF');
  const ga4Pattern = "gtag('config', 'G-3D6011MNHF');";
  
  if (html.includes(ga4Pattern)) {
    html = html.replace(
      ga4Pattern,
      `${ga4Pattern}\n        gtag('config', '${AW_ID}');`
    );
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ ${page} - added ${AW_ID}`);
    updated++;
  } else {
    console.log(`⚠️  ${page} - GA4 config not found, adding standalone tag`);
    // Add before </head>
    const adsTag = `
    <!-- Google Ads Conversion Tracking -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${AW_ID}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${AW_ID}');
    </script>`;
    html = html.replace('</head>', adsTag + '\n</head>');
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ ${page} - added standalone ${AW_ID} tag`);
    updated++;
  }
}

// Also update features.html if it exists
const featuresFile = path.join(projectRoot, 'public/features.html');
if (fs.existsSync(featuresFile)) {
  let fHtml = fs.readFileSync(featuresFile, 'utf8');
  if (!fHtml.includes(AW_ID)) {
    const ga4Pat = "gtag('config', 'G-3D6011MNHF');";
    if (fHtml.includes(ga4Pat)) {
      fHtml = fHtml.replace(ga4Pat, `${ga4Pat}\n        gtag('config', '${AW_ID}');`);
      fs.writeFileSync(featuresFile, fHtml, 'utf8');
      console.log(`✅ features.html - added ${AW_ID}`);
      updated++;
    }
  }
}

console.log(`\n🎉 Done! Updated: ${updated}, Skipped: ${skipped}`);
console.log(`📊 Google Ads tag ${AW_ID} is now installed on all pages.`);

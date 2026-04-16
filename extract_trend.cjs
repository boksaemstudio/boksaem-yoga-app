const fs = require('fs');

const code = fs.readFileSync('src/components/admin/tabs/AttendanceTrendChart.jsx', 'utf8');

// We are looking for: t('admin_trend_xxx') || t("g_xxx") || "Korean String"
const regex = /t\('([^']+)'\).*?\|\|.*?t\(\"([^\"]+)\"\).*?\|\|.*?\"([^\"]+)\"/g;
let match;
const koKeys = {};

while ((match = regex.exec(code)) !== null) {
  if (match[1].startsWith('admin_trend_')) {
    koKeys[match[1]] = match[3];
  }
}

// Some might not have g_xxx fallback: t('admin_trend_xxx') || "Korean String"
const regex2 = /t\('([^']+)'\).*?\|\|.*?\"([^\"]+)\"/g;
while ((match = regex2.exec(code)) !== null) {
  if (match[1].startsWith('admin_trend_') && !match[2].startsWith('g_')) {
    if (!koKeys[match[1]]) {
       koKeys[match[1]] = match[2];
    }
  }
}

console.log(JSON.stringify(koKeys, null, 2));


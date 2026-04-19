const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'AdminRevenue.jsx');
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Remove {t("g_21ba07") || "원"} after formatCurrency calls (already includes symbol)
// This pattern appears multiple times
content = content.replace(/\{formatCurrency\(([^)]+)\)\}\{t\("g_21ba07"\) \|\| "원"\}/g, '{formatCurrency($1)}');

// Fix 2: Replace 건 with cases in membership sales
content = content.replace(/\{ms\.count\}<\/strong>\{t\("g_d202b4"\) \|\| "건"\}/g, '{ms.count}</strong> {t("g_d202b4") || "cases"}');

fs.writeFileSync(file, content, 'utf8');
console.log('✅ AdminRevenue remaining fixes applied');

// Verify
const after = fs.readFileSync(file, 'utf8');
const wonCount = (after.match(/g_21ba07/g) || []).length;
console.log(`  Remaining "원" references: ${wonCount}`);

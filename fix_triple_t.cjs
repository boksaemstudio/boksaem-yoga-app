const fs = require('fs');
const file = 'src/pages/SuperAdminPage.jsx';
let code = fs.readFileSync(file, 'utf8');

// Replace t("g_xxx") || (t("g_yyy") || (t("g_zzz") || "Korean")) => t("g_xxx") || "Korean"
let replaced = 0;
// We need to carefully replace without breaking the structure
// Pattern: t("g_xxx") || (t("g_xxx") || (t("g_xxx") || "Korean"))
// Sometimes it's enclosed in { } or inside an object property.
code = code.replace(/t\(\s*["']([^"']+)["']\s*\)\s*\|\|\s*\(t\(\s*["'][^"']+["']\s*\)\s*\|\|\s*\(t\(\s*["'][^"']+["']\s*\)\s*\|\|\s*(["'][^"']+["'])\s*\)\s*\)/g, (match, gKey, koreanStr) => {
  replaced++;
  return `t("${gKey}") || ${koreanStr}`;
});

if (replaced > 0) {
  fs.writeFileSync(file, code);
  console.log(`Successfully replaced ${replaced} triple-t implementations.`);
} else {
  console.log('No matches found for triple-t pattern.');
}

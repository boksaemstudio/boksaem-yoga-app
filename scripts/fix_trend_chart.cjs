const fs = require('fs');
const file = 'src/components/admin/tabs/AttendanceTrendChart.jsx';
let c = fs.readFileSync(file, 'utf8');

// The original pattern was: t(t('key') || t("g_xxx") || ... || "fallback")
// After removing t(t( -> t(, we got: t('key') || t("g_xxx") || ... || "fallback")
// The extra ) at the end needs to be removed.
// 
// Strategy: Find patterns like t("g_xxxxx") || "fallback")  where the ) after "fallback" is extra
// These always end with: || "some_korean_string")
// We need to remove that trailing )

// Find lines with unbalanced parens due to this pattern
const lines = c.split('\n');
let fixed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Pattern: ... || "fallback")  where ) is extra after the closing quote
  // Look for: || "..." followed by ) that shouldn't be there
  // The key indicator: t('key') || t("g_...") || "fallback")  — the last ) is extra
  
  // Check: does this line have the pattern where a string literal is immediately followed by )
  // but NOT inside a proper function call like t("...")
  const match = line.match(/\|\|\s*"[^"]*"\)\s*(?=[}:;,+\s])/);
  if (match) {
    // Verify it's actually unbalanced
    let depth = 0;
    for (const ch of line) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
    }
    if (depth < 0) {
      // Remove the extra ) - find the last occurrence of the pattern
      // Replace: || "fallback")  with  || "fallback"
      lines[i] = line.replace(/(\|\|\s*"[^"]*")\)(\s*(?:[}:;,+]|$))/, '$1$2');
      fixed++;
      console.log(`Fixed L${i+1}: removed extra )`);
    }
  }
}

// Also clean up redundant duplicate t() calls: t("g_xxx") || t("g_xxx") || t("g_xxx") -> t("g_xxx")
let result = lines.join('\n');

// Remove duplicate t("g_xxxx") calls in || chains
// Pattern: t("g_abcdef") || t("g_abcdef") || t("g_abcdef") -> t("g_abcdef")
result = result.replace(/(t\("g_[a-f0-9]+"\))(\s*\|\|\s*t\("g_[a-f0-9]+"\)){1,10}/g, (match, first) => {
  // Check if all the || t("g_xxx") are the same key
  const keys = match.match(/t\("(g_[a-f0-9]+)"\)/g);
  const unique = [...new Set(keys)];
  if (unique.length === 1) {
    return first; // All same, keep just one
  }
  return match; // Different keys, keep as-is
});

fs.writeFileSync(file, result);
console.log(`\nFixed ${fixed} lines with unbalanced parens`);

// Verify
const verify = fs.readFileSync(file, 'utf8');
const verifyLines = verify.split('\n');
let issues = 0;
verifyLines.forEach((line, i) => {
  let depth = 0;
  for (const ch of line) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
  }
  if (depth < -1 || depth > 1) {
    // Allow depth of +1 or -1 for multi-line expressions
  }
  if (depth < -1) {
    console.log(`WARNING: L${i+1} has depth ${depth}`);
    issues++;
  }
});
console.log(`Verification: ${issues} issues remaining`);

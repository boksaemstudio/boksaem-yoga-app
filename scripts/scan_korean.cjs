/**
 * 전체 소스코드에서 한국어 하드코딩 fallback 스캔
 * t() 키가 아닌 곳에서 한국어가 UI에 노출되는 모든 위치를 찾음
 */
const fs = require('fs');
const path = require('path');

const results = [];
const KOREAN_REGEX = /[가-힣]{2,}/;

function scanFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.jsx', '.tsx', '.js', '.ts'].includes(ext)) return;
  if (filePath.includes('node_modules') || filePath.includes('dist') || filePath.includes('translations') || filePath.includes('demoLocalization') || filePath.includes('demoDataEngine')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Skip pure comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // Skip import lines
    if (trimmed.startsWith('import ')) return;
    
    // Find Korean in string literals (single/double quotes and template literals)
    // Match: || "한국어" patterns (fallback strings)
    const fallbackMatches = line.match(/\|\|\s*["'`][^"'`]*[가-힣]+[^"'`]*["'`]/g);
    if (fallbackMatches) {
      fallbackMatches.forEach(m => {
        results.push({
          file: path.relative(process.cwd(), filePath),
          line: idx + 1,
          type: 'FALLBACK',
          text: m.trim().substring(0, 80)
        });
      });
    }
    
    // Find Korean in template literals that aren't inside t() calls
    const templateMatches = line.match(/`[^`]*[가-힣]+[^`]*`/g);
    if (templateMatches) {
      templateMatches.forEach(m => {
        // Skip if it's inside a t() call
        if (m.includes('t(') || m.includes('t("')) return;
        results.push({
          file: path.relative(process.cwd(), filePath),
          line: idx + 1,
          type: 'TEMPLATE',
          text: m.substring(0, 80)
        });
      });
    }
    
    // Find hardcoded Korean strings passed directly to JSX
    const jsxMatches = line.match(/>\s*[가-힣]+[^<]*/g);
    if (jsxMatches) {
      jsxMatches.forEach(m => {
        results.push({
          file: path.relative(process.cwd(), filePath),
          line: idx + 1,
          type: 'JSX',
          text: m.trim().substring(0, 80)
        });
      });
    }
  });
}

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'scripts'].includes(item)) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      scanFile(fullPath);
    }
  });
}

scanDir(path.join(__dirname, '..', 'src'));

// Group by file
const byFile = {};
results.forEach(r => {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
});

console.log(`\n📊 전체 한국어 하드코딩 스캔 결과: ${results.length}개\n`);
console.log('='.repeat(70));

const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);
sorted.forEach(([file, items]) => {
  console.log(`\n📁 ${file} (${items.length}개)`);
  items.slice(0, 5).forEach(i => {
    console.log(`   L${i.line} [${i.type}] ${i.text}`);
  });
  if (items.length > 5) console.log(`   ... +${items.length - 5} more`);
});

// Summary by type
const byType = {};
results.forEach(r => {
  byType[r.type] = (byType[r.type] || 0) + 1;
});
console.log('\n' + '='.repeat(70));
console.log('📈 타입별 요약:');
Object.entries(byType).forEach(([type, count]) => {
  console.log(`   ${type}: ${count}개`);
});

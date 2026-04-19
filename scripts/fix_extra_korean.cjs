const fs = require('fs');
const path = require('path');

const EXTRA_DICT = {
  '일반': 'General',
  '일정이 비어 있습니다.': 'Schedule is empty.',
  '데이터 초기화란?': 'What is data reset?',
  '으로 되돌립니다.': 'will be restored.',
  '잔여': 'Remaining ',
  '회 •': 'x •',
  '표준 가격표 템플릿(심화, 일반, 하타인텐시브, 키즈플라잉)': 'standard pricing template',
  '* 예: 일반 1회권 25,000원, 심화 1회권 35,000원 등 스튜디오 평균 시세 기준': '* Example: pricing based on average studio rates',
  '기존에 추가/수정한 가격표를 지우고, 패스플로우 Ai 제공': 'Delete existing pricing and restore PassFlow AI default',
  // Template literals
};

let totalChanges = 0;

function processFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('dist') || 
      filePath.includes('translations.js') || filePath.includes('demoLocalization') || 
      filePath.includes('demoDataEngine') || filePath.includes('scripts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  Object.entries(EXTRA_DICT).forEach(([kr, en]) => {
    const p1 = `|| "${kr}"`;
    const r1 = `|| "${en}"`;
    if (content.includes(p1) && p1 !== r1) {
      content = content.split(p1).join(r1);
      changed = true;
      totalChanges++;
    }
    const p2 = `|| '${kr}'`;
    const r2 = `|| '${en}'`;
    if (content.includes(p2) && p2 !== r2) {
      content = content.split(p2).join(r2);
      changed = true;
      totalChanges++;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ ${path.relative(process.cwd(), filePath)}`);
  }
}

function scanDir(dir) {
  fs.readdirSync(dir).forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
      scanDir(fullPath);
    } else if (stat.isFile() && /\.(jsx|tsx|js|ts)$/.test(item)) {
      processFile(fullPath);
    }
  });
}

scanDir(path.join(__dirname, '..', 'src'));
console.log(`\n📊 ${totalChanges} additional Korean fallbacks replaced`);

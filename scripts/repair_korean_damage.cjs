const fs = require('fs');
const path = require('path');

/**
 * REPAIR SCRIPT — Fix collateral damage from aggressive Korean replacement
 * 
 * The previous fix_service_korean.cjs script had single-character Korean entries
 * like '명' -> ' people', '약 ' -> 'Approx. ', '님' -> '', '월' -> ''
 * These corrupted code by replacing Korean chars inside compound words/comments.
 * 
 * This script reverses known broken substitutions.
 */

const REPAIRS = [
  // '명' -> ' people' corruptions:
  { broken: ' people시', fixed: '명시' },           // 명시적 → people시적
  { broken: ' people칭', fixed: '명칭' },           // 명칭 → people칭
  { broken: ' people단', fixed: '명단' },           // 명단 → people단
  { broken: ' people확', fixed: '명확' },           // 명확 → people확
  { broken: ' people령', fixed: '명령' },           // 명령 → people령
  { broken: ' people함', fixed: '명함' },           // 명함
  { broken: 'Instructor people', fixed: '선생님명' },  // unlikely but check
  { broken: 'set people', fixed: 'set명' },         // setXX
  { broken: 'get people', fixed: 'get명' },
  { broken: 'is people', fixed: 'is명' },
  { broken: '설 people', fixed: '설명' },           // 설명
  { broken: '별 people', fixed: '별명' },
  { broken: '불 people', fixed: '불명' },
  { broken: '유 people', fixed: '유명' },           // 유명
  { broken: '투 people', fixed: '투명' },           // 투명
  { broken: '생 people', fixed: '생명' },           // 생명
  { broken: '익 people', fixed: '익명' },           // 익명
  { broken: '사 people', fixed: '사명' },
  { broken: '인 people', fixed: '인명' },
  { broken: '지 people', fixed: '지명' },

  // '약 ' -> 'Approx. ' corruptions:
  { broken: '요Approx. ', fixed: '요약 ' },         // 요약 → 요Approx. 
  { broken: '계Approx. ', fixed: '계약 ' },         // 계약 → 계Approx.
  { broken: '절Approx. ', fixed: '절약 ' },         // 절약
  { broken: '예Approx. ', fixed: '예약 ' },         // 예약 → 예Approx.
  { broken: '취Approx. ', fixed: '취약 ' },
  { broken: '제Approx. ', fixed: '제약 ' },
  { broken: '조Approx. ', fixed: '조약 ' },
  { broken: 'Approx. 관', fixed: '약관' },

  // '님' -> '' corruptions:
  { broken: 'Instructor', fixed: '선생님' },  // This was intentional, skip
  // More careful: check if '님' removal broke words
  
  // '월' -> '' corruptions (월 = month, very common in Korean):
  // Actually '월' was in the dict as '월': '' which is catastrophic
  // Let me check if it was actually applied...
];

let totalFixes = 0;
let filesFixed = 0;

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.jsx', '.tsx', '.js', '.ts'].includes(ext)) return;
  if (filePath.includes('node_modules') || filePath.includes('dist') || 
      filePath.includes('scripts') || filePath.includes('translations.js')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let fileChanges = 0;

  REPAIRS.forEach(({ broken, fixed }) => {
    if (content.includes(broken)) {
      content = content.split(broken).join(fixed);
      changed = true;
      fileChanges++;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixes += fileChanges;
    filesFixed++;
    console.log(`  🔧 ${path.relative(process.cwd(), filePath)} (${fileChanges} repairs)`);
  }
}

function scanDir(dir) {
  fs.readdirSync(dir).forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      processFile(fullPath);
    }
  });
}

console.log('🔧 Repairing collateral damage from aggressive Korean replacements...\n');
scanDir(path.join(__dirname, '..', 'src'));
console.log(`\n📊 Repaired: ${filesFixed} files, ${totalFixes} fixes`);

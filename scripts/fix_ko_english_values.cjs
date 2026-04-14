const fs = require('fs');
const content = fs.readFileSync('src/utils/translations.js', 'utf8');

// ko 블록에서 한국어 키 → 영어 값 매핑을 찾아서 한국어 키 = 한국어 값으로 교정
// 패턴: "한국어키": "English value"  →  "한국어키": "한국어키"
const koRe = /ko\s*:\s*\{/;
const koStart = content.search(koRe);
if (koStart === -1) { console.log('ko block not found'); process.exit(1); }

// ko 블록 영역 찾기
let braceCount = 0;
let koBlockStart = content.indexOf('{', koStart);
let koBlockEnd = koBlockStart;
for (let i = koBlockStart; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    if (braceCount === 0) { koBlockEnd = i; break; }
}

const koBlock = content.substring(koBlockStart, koBlockEnd + 1);
let fixCount = 0;
let newKoBlock = koBlock;

// ko 블록 내에서 한국어 키 + 비한국어(영어) 값 쌍 찾기
const kvRe = /"([^"]+)"\s*:\s*"([^"]+)"/g;
let m;
const fixes = [];
while ((m = kvRe.exec(koBlock)) !== null) {
    const key = m[1];
    const val = m[2];
    // 키에 한국어가 포함되어 있고, 값에 한국어가 없는 경우 (영어)
    const keyHasKorean = /[\uAC00-\uD7AF]/.test(key);
    const valHasKorean = /[\uAC00-\uD7AF]/.test(val);
    if (keyHasKorean && !valHasKorean && key !== val) {
        fixes.push({ from: m[0], to: `"${key}": "${key}"` });
        fixCount++;
    }
}

// 수정 적용
fixes.forEach(f => {
    newKoBlock = newKoBlock.replace(f.from, f.to);
});

const result = content.substring(0, koBlockStart) + newKoBlock + content.substring(koBlockEnd + 1);
fs.writeFileSync('src/utils/translations.js', result);
console.log('✅ Fixed', fixCount, 'ko keys with wrong English values');

// 검증: 몇 개 뽑아서 확인
const sampleKeys = ['총 출석 완료', '건', '삭제된 항목이 없습니다', '소식 및 공지 관리', '명'];
sampleKeys.forEach(k => {
    const re = new RegExp('"' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*"([^"]*)"');
    const mm = result.match(re);
    console.log('  ' + k + ' → ' + (mm ? mm[1].substring(0, 50) : 'NOT FOUND'));
});

/**
 * PassFlow AI 글로벌 현지화 전수 감사 스크립트
 * 
 * 모든 JSX/JS 소스 파일에서:
 * 1. 하드코딩된 한국어 문자열 (t() 바깥)
 * 2. t() fallback에 한국어가 있는 경우
 * 3. 주석이 아닌 실제 UI 렌더링 코드의 한국어
 * 4. alert/confirm에 하드코딩된 한국어
 * 를 전수 조사합니다.
 */
const fs = require('fs');
const path = require('path');
const glob = require('child_process').execSync;

// 재귀적으로 파일 수집
function getFiles(dir, ext) {
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') continue;
            results.push(...getFiles(fullPath, ext));
        } else if (ext.some(e => item.name.endsWith(e))) {
            results.push(fullPath);
        }
    }
    return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = getFiles(srcDir, ['.jsx', '.js']);

// 한국어 정규식
const koRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const koCharRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g;

// 제외 파일
const EXCLUDE_FILES = ['translations.js', 'demoLocalization.js', 'translations.test.js'];

// 분류 카운터
const results = {
    hardcoded_ui: [],      // JSX에서 t() 없이 직접 한국어 렌더링
    hardcoded_alert: [],   // alert/confirm에 한국어
    fallback_korean: [],   // t('key') || '한국어' 패턴 (영어 fallback으로 교체 필요)
    comment_only: [],      // 주석에만 있는 것 (무해함)
    config_data: [],       // 설정 데이터/상수에 있는 것
};

for (const filePath of files) {
    const fileName = path.basename(filePath);
    if (EXCLUDE_FILES.includes(fileName)) continue;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(path.join(__dirname, '..'), filePath);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!koRegex.test(line)) continue;
        
        const lineNum = i + 1;
        const trimmed = line.trim();
        
        // 한국어 문자열 추출
        const koMatches = trimmed.match(koCharRegex);
        if (!koMatches) continue;
        const koText = koMatches.join(' ');
        
        // 분류
        // 1. 순수 주석인 경우
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            results.comment_only.push({ file: relPath, line: lineNum, text: koText.substring(0, 50) });
            continue;
        }
        
        // 2. alert/confirm에 한국어
        if (trimmed.includes('alert(') || trimmed.includes('confirm(')) {
            if (!trimmed.includes('t(') && !trimmed.includes('t("') && !trimmed.includes("t('")) {
                results.hardcoded_alert.push({ file: relPath, line: lineNum, text: koText.substring(0, 60) });
                continue;
            }
        }
        
        // 3. t('key') || '한국어' 패턴 (영어 fallback이 아닌 한국어 fallback)
        if (/\|\|\s*['"`]/.test(trimmed) && /t\(/.test(trimmed)) {
            // t() || '한국어' 형태
            const fallbackMatch = trimmed.match(/\|\|\s*['"`]([^'"`]*[\uAC00-\uD7AF][^'"`]*)['"`]/);
            if (fallbackMatch) {
                results.fallback_korean.push({ file: relPath, line: lineNum, text: fallbackMatch[1].substring(0, 60) });
                continue;
            }
        }
        
        // 4. JSX에서 직접 한국어 렌더링 (태그 사이 텍스트)
        if (/>[\s]*[^<]*[\uAC00-\uD7AF]/.test(trimmed) && !trimmed.includes('t(') && !trimmed.includes('option value')) {
            results.hardcoded_ui.push({ file: relPath, line: lineNum, text: koText.substring(0, 60) });
            continue;
        }
        
        // 5. 문자열 리터럴에 한국어 (config/data)
        if (/['"`][^'"`]*[\uAC00-\uD7AF]/.test(trimmed) && !trimmed.includes('t(')) {
            results.config_data.push({ file: relPath, line: lineNum, text: koText.substring(0, 60) });
            continue;
        }
    }
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║   PassFlow AI 글로벌 현지화 전수 감사 보고서              ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log(`🔴 하드코딩 UI 텍스트 (Critical): ${results.hardcoded_ui.length}건`);
console.log(`🔴 하드코딩 Alert/Confirm: ${results.hardcoded_alert.length}건`);
console.log(`🟡 한국어 Fallback (t() || '한국어'): ${results.fallback_korean.length}건`);
console.log(`⚪ 설정/데이터 한국어: ${results.config_data.length}건`);
console.log(`💬 주석 한국어 (무해): ${results.comment_only.length}건`);

console.log('\n━━━ 🔴 하드코딩 UI (즉시 수정 필요) ━━━');
// 파일별 그룹핑
const uiByFile = {};
for (const item of results.hardcoded_ui) {
    if (!uiByFile[item.file]) uiByFile[item.file] = [];
    uiByFile[item.file].push(item);
}
for (const [file, items] of Object.entries(uiByFile)) {
    console.log(`\n  📄 ${file} (${items.length}건)`);
    for (const item of items.slice(0, 5)) {
        console.log(`     L${item.line}: ${item.text}`);
    }
    if (items.length > 5) console.log(`     ... 외 ${items.length - 5}건`);
}

console.log('\n━━━ 🔴 하드코딩 Alert/Confirm ━━━');
for (const item of results.hardcoded_alert) {
    console.log(`  📄 ${item.file}:${item.line} → ${item.text}`);
}

console.log('\n━━━ 🟡 한국어 Fallback (t() || "한국어") ━━━');
const fbByFile = {};
for (const item of results.fallback_korean) {
    if (!fbByFile[item.file]) fbByFile[item.file] = [];
    fbByFile[item.file].push(item);
}
for (const [file, items] of Object.entries(fbByFile)) {
    console.log(`\n  📄 ${file} (${items.length}건)`);
    for (const item of items.slice(0, 3)) {
        console.log(`     L${item.line}: "${item.text}"`);
    }
    if (items.length > 3) console.log(`     ... 외 ${items.length - 3}건`);
}

console.log('\n\n총 수정 필요: ' + (results.hardcoded_ui.length + results.hardcoded_alert.length) + '건 (Critical)');
console.log('총 개선 필요: ' + results.fallback_korean.length + '건 (Fallback → 영어 전환)');

// This file was for development verification only and is not part of the production build
// It has errors because it's not properly configured for the linter
// Adding /* eslint-disable */ to suppress all lint errors for this development script

/* eslint-disable */
// 전체 코드 검증 스크립트
const fs = require('fs');
const path = require('path');

// storage.js에서 모든 메서드 추출
function extractStorageMethods() {
    const storageFile = fs.readFileSync('src/services/storage.js', 'utf-8');
    const methods = new Set();

    // export const storageService = { ... } 내부의 메서드 찾기
    const methodRegex = /^\s+(\w+)\s*[:(]/gm;
    let match;

    while ((match = methodRegex.exec(storageFile)) !== null) {
        const methodName = match[1];
        // 내부 헬퍼 함수는 제외 (_로 시작)
        if (!methodName.startsWith('_') && methodName !== ' storageService') {
            methods.add(methodName);
        }
    }

    return Array.from(methods).sort();
}

// 모든 소스파일에서 storageService 호출 추출
function extractStorageCalls(dir, calls = new Set()) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                extractStorageCalls(filePath, calls);
            }
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const callRegex = /storageService\.(\w+)\(/g;
            let match;

            while ((match = callRegex.exec(content)) !== null) {
                calls.add(match[1]);
            }
        }
    }

    return Array.from(calls).sort();
}

console.log('=== 전체 코드 검증 시작 ===\n');

// 1. storage.js의 메서드 목록
const implementedMethods = extractStorageMethods();
console.log('✅ storage.js에 구현된 메서드 (' + implementedMethods.length + '개):');
console.log(implementedMethods.join(', '));
console.log('');

// 2. 실제 호출되는 메서드 목록
const calledMethods = extractStorageCalls('src');
console.log('📞 소스 코드에서 호출되는 메서드 (' + calledMethods.length + '개):');
console.log(calledMethods.join(', '));
console.log('');

// 3. 누락된 메서드 찾기
const missingMethods = calledMethods.filter(m => !implementedMethods.includes(m));

if (missingMethods.length === 0) {
    console.log('✅ 모든 메서드가 구현되어 있습니다!');
} else {
    console.log('❌ 누락된 메서드 (' + missingMethods.length + '개):');
    missingMethods.forEach(m => {
        console.log('  - ' + m);
    });
}

console.log('\n=== 검증 완료 ===');

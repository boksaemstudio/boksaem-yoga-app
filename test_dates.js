/**
 * dates.js 리팩토링 검증 테스트
 */
import { getDaysRemaining, getTodayKST } from './src/utils/dates.js';

console.log('='.repeat(60));
console.log('🔬 dates.js 함수 상세 테스트');
console.log('='.repeat(60));

const today = getTodayKST();
console.log('오늘 날짜 (KST):', today);
console.log();

// 테스트 케이스
const tests = [
    { input: null, expected: null, desc: 'null 입력' },
    { input: undefined, expected: null, desc: 'undefined 입력' },
    { input: 'TBD', expected: null, desc: 'TBD 문자열' },
    { input: 'unlimited', expected: null, desc: 'unlimited 문자열' },
    { input: 'invalid-date', expected: null, desc: '잘못된 날짜' },
    { input: today, expected: 0, desc: '오늘' },
    { input: '2026-02-08', expected: 7, desc: '일주일 후' },
    { input: '2026-01-25', expected: -7, desc: '일주일 전 (만료)' },
];

let passed = 0;
let failed = 0;

tests.forEach(t => {
    const result = getDaysRemaining(t.input);
    const ok = result === t.expected;
    if (ok) passed++; else failed++;
    console.log(`${ok ? '✅' : '❌'} ${t.desc}: '${t.input}' => ${result} (예상: ${t.expected})`);
});

console.log();
console.log('='.repeat(60));
console.log(`결과: ${passed}/${tests.length} 통과, ${failed} 실패`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);

// Quick test for AI parsing fixes
const AI = require('../utils/ai');
const ai = new AI('fake-key-for-test');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch(e) {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

// Test 1: Repair truncated JSON with unclosed string
test('Repair: unclosed string', () => {
    const input = '{"message": "충분히 이해했어요", "feedbackPoints": ["오늘의 명상을 완주하셨';
    const result = ai._repairTruncatedJson(input);
    const parsed = JSON.parse(result);
    assert(parsed.message === '충분히 이해했어요', 'message mismatch');
    assert(parsed.feedbackPoints[0] === '오늘의 명상을 완주하셨', 'feedbackPoints mismatch');
});

// Test 2: Repair truncated JSON with unclosed array
test('Repair: unclosed array', () => {
    const input = '{"options": ["좋아요", "그래요"';
    const result = ai._repairTruncatedJson(input);
    const parsed = JSON.parse(result);
    assert(Array.isArray(parsed.options), 'options is not array');
    assert(parsed.options.length === 2, 'options length mismatch');
});

// Test 3: Regex fallback - extract message
test('Regex: extract message', () => {
    const input = '{"message": "오늘 기분이 어떠세요?", "broken...';
    const result = ai._regexFallback(input);
    assert(result !== null, 'result is null');
    assert(result.message === '오늘 기분이 어떠세요?', 'message mismatch: ' + result.message);
});

// Test 4: Regex fallback - extract feedbackPoints array
test('Regex: extract feedbackPoints', () => {
    const input = '{"message": "수고하셨어요", "feedbackPoints": ["점 하나", "점 둘", "점 셋"]}';
    const result = ai._regexFallback(input);
    assert(result !== null, 'result is null');
    assert(result.feedbackPoints.length === 3, 'feedbackPoints count: ' + result.feedbackPoints.length);
});

// Test 5: Regex fallback - extract boolean
test('Regex: extract isFinalAnalysis', () => {
    const input = '{"message": "이해했어요", "isFinalAnalysis": true, "mappedDiagnosis": "stress"}';
    const result = ai._regexFallback(input);
    assert(result.isFinalAnalysis === true, 'isFinalAnalysis mismatch');
    assert(result.mappedDiagnosis === 'stress', 'diagnosis mismatch');
});

// Test 6: Regex fallback - korean with escaped quotes
test('Regex: korean with special chars', () => {
    const input = '{"message": "왼쪽으로 기울어졌어요", "options": ["네", "아니요"]}';
    const result = ai._regexFallback(input);
    assert(result.message === '왼쪽으로 기울어졌어요', 'message: ' + result.message);
    assert(result.options.length === 2, 'options');
});

// Test 7: maxOutputTokens is 2500
test('Config: maxOutputTokens is 2500', () => {
    assert(ai.jsonConfig.maxOutputTokens === 2500, 'got: ' + ai.jsonConfig.maxOutputTokens);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

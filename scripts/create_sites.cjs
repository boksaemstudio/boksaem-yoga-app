/**
 * Firebase Hosting 사이트 생성 — 사용 가능한 이름을 자동으로 찾아서 생성
 */
const { execSync } = require('child_process');

// 프로젝트 고유 접두사를 사용해 충돌 최소화
const demoCandidates = [
    'boksaem-yoga-demo',
    'boksaem-demo-app',
    'passflow-demo-2026',
    'boksaem-passflow-demo',
    'yoga-demo-boksaem',
];

const ssangmunCandidates = [
    'ssangmun-yoga-studio',
    'ssangmun-yoga-app',
    'ssangmunyoga-kr',
    'ssangmun-ashtanga',
    'yoga-ssangmun',
];

function tryCreate(candidates, label) {
    for (const name of candidates) {
        try {
            console.log(`  시도: ${name}...`);
            const out = execSync(`firebase hosting:sites:create ${name} 2>&1`, {
                encoding: 'utf8',
                timeout: 15000,
                cwd: 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app'
            });
            if (out.includes('has been created')) {
                console.log(`  ✅ 생성 성공: ${name}`);
                return name;
            }
        } catch (e) {
            const msg = (e.stdout || e.message || '').slice(-150);
            if (msg.includes('Invalid name') || msg.includes('already exists') || msg.includes('Permission')) {
                console.log(`  ❌ ${name} — 사용 불가`);
                continue;
            }
            console.log(`  ❌ ${name} — ${msg.trim()}`);
            continue;
        }
    }
    return null;
}

console.log('🔍 데모앱 사이트 생성 중...');
const demoSite = tryCreate(demoCandidates, 'demo');
console.log('');

console.log('🔍 쌍문요가 사이트 생성 중...');
const ssangmunSite = tryCreate(ssangmunCandidates, 'ssangmun');
console.log('');

console.log('═══════════════════════════════════════');
if (demoSite) console.log(`✅ 데모앱: ${demoSite}.web.app`);
else console.log('❌ 데모앱: 모든 후보 실패');
if (ssangmunSite) console.log(`✅ 쌍문요가: ${ssangmunSite}.web.app`);
else console.log('❌ 쌍문요가: 모든 후보 실패');
console.log('═══════════════════════════════════════');

// 결과를 JSON으로 저장 (후속 스크립트에서 사용)
const result = { demo: demoSite, ssangmun: ssangmunSite };
require('fs').writeFileSync(
    'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\scripts\\site_names.json',
    JSON.stringify(result, null, 2)
);
console.log('\n결과 저장: scripts/site_names.json');
process.exit(0);

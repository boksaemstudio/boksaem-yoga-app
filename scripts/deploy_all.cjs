/**
 * 전체 배포 스크립트 (에러 상세 출력)
 */
const { execSync } = require('child_process');

const sites = ['boksaem-yoga', 'passflow-demo', 'ssangmun-yoga'];

console.log('🚀 전체 배포 시작...\n');

for (const site of sites) {
    console.log(`📦 ${site} 배포 중...`);
    try {
        const out = execSync(`firebase deploy --only hosting:${site} 2>&1`, { 
            cwd: 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app',
            encoding: 'utf8',
            timeout: 120000 
        });
        console.log(out);
        console.log(`✅ ${site} 배포 완료!\n`);
    } catch (e) {
        const output = e.stdout || e.stderr || e.message || '';
        console.error(`❌ ${site} 배포 실패:`);
        console.error(output.slice(-1000));
        console.log('');
    }
}

console.log('🎯 배포 프로세스 완료!');
process.exit(0);

// Node.js 17+ IPv6 DNS 해석 버그 해결을 위한 전역 스크립트 실행기
const child_process = require('child_process');
const path = require('path');

// 강제로 IPv4를 우선 해석하게 만드는 Node.js 환경변수 주입
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('사용법: node run.js [스크립트경로]');
    process.exit(1);
}

const targetScript = path.resolve(args[0]);
const runArgs = args.slice(1);

console.log(`🚀 [IPv4 강제 모드] 실행: ${targetScript}`);

const child = child_process.spawn('node', [
    '-e', `require("dns").setDefaultResultOrder("ipv4first"); require("${targetScript.replace(/\\/g, '\\\\')}");`,
    ...runArgs
], { stdio: 'inherit' });

child.on('exit', (code) => {
    process.exit(code || 0);
});

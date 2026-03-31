const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const { refreshDemoData } = require('./helpers/demoSeeder');

async function run() {
    console.log('--- 데모 데이터 수동 갱신 시작 ---');
    await refreshDemoData();
    console.log('--- 데모 데이터 갱신 완료 ---');
    process.exit(0);
}
run().catch(e => { console.error('에러 발생:', e); process.exit(1); });

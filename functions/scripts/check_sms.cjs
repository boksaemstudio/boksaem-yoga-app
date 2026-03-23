const admin = require('firebase-admin');
const sa = require('../service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = (col) => db.collection(`studios/boksaem-yoga/${col}`);

(async () => {
    // 1. 오늘 문자 발송 확인
    console.log('=== 오늘(2026-03-22) 문자 발송 확인 ===');
    try {
        const snap = await tdb('messages').orderBy('createdAt', 'desc').limit(20).get();
        let count = 0;
        snap.docs.forEach(d => {
            const x = d.data();
            let dt = '';
            if (x.createdAt && x.createdAt.toDate) dt = x.createdAt.toDate().toISOString().split('T')[0];
            if (dt === '2026-03-22') {
                count++;
                console.log(`  ${dt} | ${x.memberName || 'N/A'} | sendMode=${x.sendMode || 'N/A'} | ${(x.content || '').substring(0, 50)}`);
            }
        });
        if (count === 0) console.log('✅ 오늘 발송된 문자 없음');
        else console.log(`총 ${count}건 발송`);
    } catch (e) { console.error('messages 조회 실패:', e.message); }

    // 2. Solapi 잔액 조회
    console.log('\n=== Solapi 문자서비스 잔액 ===');
    try {
        const { SolapiMessageService } = require("solapi");
        const apiKey = process.env.SOLAPI_API_KEY;
        const apiSecret = process.env.SOLAPI_API_SECRET;
        if (!apiKey || !apiSecret) {
            console.log('❌ SOLAPI_API_KEY/SECRET 환경변수 없음. .env 파일 확인...');
            const fs = require('fs');
            const envContent = fs.readFileSync('.env', 'utf8');
            const keyMatch = envContent.match(/SOLAPI_API_KEY=(.+)/);
            const secretMatch = envContent.match(/SOLAPI_API_SECRET=(.+)/);
            if (keyMatch && secretMatch) {
                const svc = new SolapiMessageService(keyMatch[1].trim(), secretMatch[1].trim());
                const balance = await svc.getBalance();
                console.log(JSON.stringify(balance, null, 2));
            } else {
                console.log('❌ .env에서도 키를 찾을 수 없음');
            }
        } else {
            const svc = new SolapiMessageService(apiKey, apiSecret);
            const balance = await svc.getBalance();
            console.log(JSON.stringify(balance, null, 2));
        }
    } catch (e) { console.error('잔액 조회 실패:', e.message); }

    process.exit(0);
})();

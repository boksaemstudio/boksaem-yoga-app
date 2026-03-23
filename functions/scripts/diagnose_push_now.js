const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'service-account-key.json'));
if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = (col) => db.collection(`studios/boksaem-yoga/${col}`);

async function run() {
    console.log('=== 1. FCM 토큰 전수 조사 ===');
    const cols = ['fcm_tokens', 'fcmTokens', 'push_tokens'];
    for (const c of cols) {
        try {
            const s = await tdb(c).get();
            console.log(`[${c}] ${s.size}개 토큰`);
            s.docs.forEach(d => {
                const x = d.data();
                console.log(`  ${d.id.substring(0, 25)}... memberId=${x.memberId || 'N/A'} role=${x.role || 'N/A'} instrName=${x.instructorName || 'N/A'} updated=${x.updatedAt || 'N/A'}`);
            });
        } catch (e) { console.log(`[${c}] error: ${e.message}`); }
    }

    console.log('\n=== 2. 최근 메시지 pushStatus ===');
    try {
        const ms = await tdb('messages').orderBy('createdAt', 'desc').limit(5).get();
        ms.docs.forEach(d => {
            const x = d.data();
            console.log(`to: ${x.memberId || 'N/A'} | pushStatus: ${JSON.stringify(x.pushStatus || '없음')} | sendMode: ${x.sendMode || 'N/A'} | content: ${(x.content || '').substring(0, 30)}...`);
        });
    } catch (e) { console.log('msg err:', e.message); }

    console.log('\n=== 3. 송미호 회원 토큰 조회 ===');
    try {
        const ms2 = await tdb('members').where('name', '==', '송미호').get();
        if (ms2.empty) { console.log('송미호 회원 미발견'); }
        else {
            for (const d of ms2.docs) {
                console.log(`memberId=${d.id} pushEnabled=${d.data().pushEnabled} fcmToken=${(d.data().fcmToken || 'N/A').substring(0, 25)}...`);
                for (const c of cols) {
                    try {
                        const ts = await tdb(c).where('memberId', '==', d.id).get();
                        console.log(`  [${c}] ${ts.size}개`);
                        ts.docs.forEach(t => console.log(`    token=${t.id.substring(0, 25)}... updated=${t.data().updatedAt}`));
                    } catch (e) { console.log(`  [${c}] error`); }
                }
            }
        }
    } catch (e) { console.log('err:', e.message); }

    console.log('\n=== 4. 원장 instructor 토큰 ===');
    try {
        const is = await tdb('fcm_tokens').where('role', '==', 'instructor').get();
        console.log(`instructor 토큰: ${is.size}개`);
        is.docs.forEach(d => {
            const x = d.data();
            console.log(`  ${x.instructorName || 'N/A'} | token=${d.id.substring(0, 25)}... | updated=${x.updatedAt || 'N/A'}`);
        });
    } catch (e) { console.log('err:', e.message); }

    console.log('\n=== 5. 최근 push_history ===');
    try {
        const ph = await tdb('push_history').orderBy('createdAt', 'desc').limit(5).get();
        console.log(`push_history: ${ph.size}건`);
        ph.docs.forEach(d => {
            const x = d.data();
            console.log(`  type=${x.type} title=${x.title} success=${x.successCount} fail=${x.failureCount}`);
        });
    } catch (e) { console.log('err:', e.message); }

    process.exit(0);
}
run();

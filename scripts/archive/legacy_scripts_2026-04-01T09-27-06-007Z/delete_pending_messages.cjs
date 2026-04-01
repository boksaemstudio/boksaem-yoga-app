const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function deletePendingMessages() {
    const messagesRef = db.collection('studios/boksaem-yoga/messages');
    
    // 단일 필드 쿼리 — 복합 인덱스 불필요
    const snapshot = await messagesRef.where('status', '==', 'pending').get();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const targets = snapshot.docs.filter(doc => {
        const d = doc.data();
        return d.type === 'admin_individual' && d.createdAt >= oneHourAgo;
    });

    console.log(`\n📋 총 pending: ${snapshot.size}건, 최근 1시간 내 admin_individual: ${targets.length}건\n`);

    if (targets.length === 0) {
        console.log('✅ 삭제할 메시지가 없습니다.');
        process.exit(0);
    }

    targets.forEach(doc => {
        const d = doc.data();
        console.log(`  - [${doc.id}] member: ${d.memberId}, "${(d.content || '').substring(0, 60)}...", ${d.createdAt}`);
    });

    console.log(`\n🗑️ ${targets.length}건 삭제 중...`);
    const batch = db.batch();
    targets.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`✅ ${targets.length}건 삭제 완료!`);
    process.exit(0);
}

deletePendingMessages().catch(err => { console.error('❌', err); process.exit(1); });

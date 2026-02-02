const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testPushHistoryLogging() {
    const memberId = 'TdmSong'; // 송대민 회원 ID (추정, 확인 필요)
    const memberSnap = await db.collection('members').doc(memberId).get();
    
    if (!memberSnap.exists) {
        console.log('Member not found');
        return;
    }
    
    const memberData = memberSnap.data();
    const memberName = memberData.name;
    
    console.log(`Sending test push for ${memberName} (${memberId})...`);
    
    // Cloud Functions에서 수행하는 로직 시뮬레이션
    await db.collection('push_history').add({
        type: 'individual',
        title: '테스트 알림',
        body: '회원 이름이 잘 기록되는지 확인 중입니다.',
        content: '회원 이름이 잘 기록되는지 확인 중입니다.',
        status: 'sent',
        successCount: 1,
        failureCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        targetMemberId: memberId,
        memberName: memberName // 이 필드가 핵심
    });
    
    console.log('Push history record added with memberName.');
}

testPushHistoryLogging().then(() => process.exit());

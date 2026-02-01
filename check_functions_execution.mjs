// Check Cloud Functions logs for sendPushOnMessageV2
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

async function checkCloudFunctionsExecution() {
    console.log('\n🔍 Cloud Functions 실행 확인 중...\n');

    try {
        // Get last 5 messages
        const messagesSnapshot = await db.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        console.log(`📧 최근 메시지 ${messagesSnapshot.size}개:\n`);

        for (const doc of messagesSnapshot.docs) {
            const data = doc.data();
            console.log(`메시지 ID: ${doc.id}`);
            console.log(`  대상 회원: ${data.memberId}`);
            console.log(`  내용: ${data.content?.substring(0, 30)}...`);
            console.log(`  전송 시간: ${data.timestamp || data.createdAt}`);
            console.log(`  푸시 상태: ${data.pushStatus ? JSON.stringify(data.pushStatus, null, 2) : '❌ pushStatus 없음 (Cloud Function 미실행?)'}`);
            console.log('');
        }

        // Get last 3 notices
        const noticesSnapshot = await db.collection('notices')
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();

        console.log(`\n📢 최근 공지사항 ${noticesSnapshot.size}개:\n`);

        for (const doc of noticesSnapshot.docs) {
            const data = doc.data();
            console.log(`공지 ID: ${doc.id}`);
            console.log(`  제목: ${data.title}`);
            console.log(`  등록: ${data.timestamp || data.date}`);
            console.log(`  푸시 상태: ${data.pushStatus ? JSON.stringify(data.pushStatus, null, 2) : '❌ pushStatus 없음 (Cloud Function 미실행?)'}`);
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkCloudFunctionsExecution().then(() => {
    console.log('✅ 점검 완료!');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

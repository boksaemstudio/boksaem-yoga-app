// Direct FCM push notification test
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(
    readFileSync('./functions/service-account-key.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testPushNotification() {
    console.log('\n🧪 FCM 푸시 알림 직접 테스트 시작...\n');

    try {
        // 1. Get all FCM tokens
        const tokensSnapshot = await db.collection('fcm_tokens').get();

        if (tokensSnapshot.empty) {
            console.error('❌ fcm_tokens 컬렉션에 토큰이 없습니다!');
            return;
        }

        console.log(`✅ ${tokensSnapshot.size}개의 토큰 발견\n`);

        // 2. Test each token
        for (const doc of tokensSnapshot.docs) {
            const token = doc.id;
            const data = doc.data();

            console.log(`\n📱 토큰 테스트: ${token.substring(0, 20)}...`);
            console.log(`   회원 ID: ${data.memberId || '없음'}`);
            console.log(`   플랫폼: ${data.platform || 'unknown'}`);
            console.log(`   갱신: ${data.updatedAt || '없음'}`);

            // 3. Send test message
            const message = {
                token: token,
                notification: {
                    title: '🧪 테스트 알림',
                    body: `${new Date().toLocaleTimeString()} - 푸시 알림 테스트 메시지입니다!`
                },
                data: {
                    test: 'true',
                    timestamp: new Date().toISOString()
                },
                webpush: {
                    fcmOptions: {
                        link: 'https://boksaem-yoga.web.app'
                    },
                    notification: {
                        icon: '/logo_circle.png',
                        badge: '/logo_circle.png'
                    }
                }
            };

            try {
                const response = await admin.messaging().send(message);
                console.log(`   ✅ 전송 성공! 응답: ${response}`);
            } catch (error) {
                console.error(`   ❌ 전송 실패: ${error.code}`);
                console.error(`   세부 정보: ${error.message}`);

                // If token is invalid, mark it
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    console.log(`   ⚠️  이 토큰은 무효합니다 - 삭제가 필요합니다`);
                }
            }
        }

        console.log('\n✅ 테스트 완료!\n');

    } catch (error) {
        console.error('❌ 테스트 실패:', error);
    }
}

testPushNotification().then(() => {
    console.log('프로그램 종료');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

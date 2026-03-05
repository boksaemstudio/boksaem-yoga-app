const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkInstructorToken(name) {
    console.log(`=== 강사 [${name}] 푸시 알림 설정 확인 ===`);
    try {
        const snapshot = await db.collection('fcm_tokens')
            .where('role', '==', 'instructor')
            .where('instructorName', '==', name)
            .get();

        if (snapshot.empty) {
            console.log(`❌ [${name}] 강사님으로 등록된 푸시 토큰이 없습니다.`);
            console.log(`도움말: 강사 앱 [홈] 탭 하단의 '알림 허용하기' 버튼을 눌러야 합니다.`);
        } else {
            console.log(`✅ [${name}] 강사님으로 등록된 토큰이 ${snapshot.size}개 발견되었습니다.`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(` - 토큰 ID: ${doc.id.substring(0, 10)}...`);
                console.log(` - 업데이트 일시: ${data.updatedAt}`);
                console.log(` - 플랫폼: ${data.platform || 'unknown'}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('조회 중 오류 발생:', error);
    }
}

checkInstructorToken('원장');

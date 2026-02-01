/**
 * 무효한 FCM 토큰 정리 스크립트
 * Firebase Admin SDK를 사용하여 유효하지 않은 토큰들을 검증하고 삭제합니다.
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Admin 초기화
const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'functions', 'service-account-key.json'), 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();

async function cleanupInvalidTokens() {
    console.log('\n🧹 무효한 FCM 토큰 정리 시작...\n');

    const tokensSnapshot = await db.collection('fcm_tokens').get();

    if (tokensSnapshot.empty) {
        console.log('토큰이 없습니다.');
        process.exit(0);
    }

    console.log(`총 ${tokensSnapshot.size}개의 토큰을 검증합니다...\n`);

    const invalidTokens = [];
    const validTokens = [];
    let checkedCount = 0;

    for (const doc of tokensSnapshot.docs) {
        const token = doc.id;
        const tokenData = doc.data();
        checkedCount++;

        try {
            // 테스트 메시지 전송으로 토큰 유효성 검증
            const dryRunResult = await admin.messaging().send({
                token: token,
                notification: {
                    title: 'Test',
                    body: 'Validation'
                },
                data: {
                    test: 'true'
                }
            }, true); // dry run

            console.log(`✅ [${checkedCount}/${tokensSnapshot.size}] 유효한 토큰: ${token.substring(0, 20)}... (회원: ${tokenData.memberId || '없음'})`);
            validTokens.push({ token, data: tokenData });

        } catch (error) {
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                console.log(`❌ [${checkedCount}/${tokensSnapshot.size}] 무효한 토큰: ${token.substring(0, 20)}... (회원: ${tokenData.memberId || '없음'})`);
                invalidTokens.push({ token, data: tokenData, error: error.code });
            } else {
                console.log(`⚠️  [${checkedCount}/${tokensSnapshot.size}] 검증 실패: ${token.substring(0, 20)}... - ${error.message}`);
            }
        }

        // Rate limiting 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 검증 결과:`);
    console.log(`   유효한 토큰: ${validTokens.length}개`);
    console.log(`   무효한 토큰: ${invalidTokens.length}개\n`);

    if (invalidTokens.length === 0) {
        console.log('✅ 모든 토큰이 유효합니다!');
        process.exit(0);
    }

    // 무효한 토큰 삭제 확인
    console.log(`\n⚠️  ${invalidTokens.length}개의 무효한 토큰을 삭제하시겠습니까?`);
    console.log('이 작업은 되돌릴 수 없습니다.\n');

    // 자동 삭제 (스크립트이므로)
    console.log('5초 후 자동으로 삭제합니다...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🗑️  무효한 토큰 삭제 중...\n');

    const batch = db.batch();
    let deletedCount = 0;

    for (const item of invalidTokens) {
        const docRef = db.collection('fcm_tokens').doc(item.token);
        batch.delete(docRef);
        deletedCount++;

        if (deletedCount % 10 === 0) {
            console.log(`   ${deletedCount}/${invalidTokens.length} 삭제 완료...`);
        }
    }

    await batch.commit();

    console.log(`\n✅ ${deletedCount}개의 무효한 토큰이 삭제되었습니다!`);
    console.log(`\n💡 다음 단계:`);
    console.log(`   1. 회원들에게 앱을 다시 열어서 "알림 허용"을 누르도록 안내하세요.`);
    console.log(`   2. PWA로 설치된 경우, 재설치를 권장합니다.`);
    console.log(`   3. Service Worker가 제대로 등록되는지 확인하세요.\n`);

    process.exit(0);
}

cleanupInvalidTokens().catch(error => {
    console.error('정리 중 오류 발생:', error);
    process.exit(1);
});

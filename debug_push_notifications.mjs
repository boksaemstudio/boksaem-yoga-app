/**
 * 푸시 알림 디버깅 스크립트
 * FCM 토큰과 최근 메시지의 전송 상태를 확인합니다.
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

async function debugPushNotifications() {
    console.log('\n🔍 FCM 토큰 및 푸시 알림 상태 점검 시작...\n');

    // 1. FCM 토큰 컬렉션 확인
    console.log('1️⃣  FCM 토큰 수집 중...');
    const collectionsToCheck = ['fcm_tokens', 'fcmTokens', 'push_tokens'];
    const allTokens = [];

    for (const collectionName of collectionsToCheck) {
        try {
            const snapshot = await db.collection(collectionName).get();
            if (!snapshot.empty) {
                console.log(`   ✓ ${collectionName}: ${snapshot.size}개 토큰 발견`);
                snapshot.docs.forEach(doc => {
                    allTokens.push({
                        collection: collectionName,
                        token: doc.id,
                        ...doc.data()
                    });
                });
            } else {
                console.log(`   - ${collectionName}: 토큰 없음`);
            }
        } catch (error) {
            console.log(`   ✗ ${collectionName}: 오류 - ${error.message}`);
        }
    }

    console.log(`\n   총 ${allTokens.length}개의 FCM 토큰 발견\n`);

    // 2. memberId별 토큰 분류
    console.log('2️⃣  회원별 토큰 분석...');
    const tokensByMember = {};
    const ghostTokens = [];

    allTokens.forEach(tokenData => {
        if (tokenData.memberId) {
            if (!tokensByMember[tokenData.memberId]) {
                tokensByMember[tokenData.memberId] = [];
            }
            tokensByMember[tokenData.memberId].push(tokenData);
        } else {
            ghostTokens.push(tokenData);
        }
    });

    console.log(`   회원과 연결된 토큰: ${Object.keys(tokensByMember).length}명`);
    console.log(`   유령 토큰 (memberId 없음): ${ghostTokens.length}개\n`);

    // 3. 최근 메시지 분석
    console.log('3️⃣  최근 전송된 메시지 분석 (최근 10개)...');
    const messagesSnapshot = await db.collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

    if (messagesSnapshot.empty) {
        console.log('   전송된 메시지가 없습니다.\n');
    } else {
        console.log(`\n   총 ${messagesSnapshot.size}개의 메시지 발견:\n`);

        for (const msgDoc of messagesSnapshot.docs) {
            const msg = msgDoc.data();
            console.log(`   📧 메시지 ID: ${msgDoc.id}`);
            console.log(`      대상 회원: ${msg.memberId || '없음'}`);
            console.log(`      내용: ${msg.content?.substring(0, 50)}...`);
            console.log(`      전송 시간: ${msg.timestamp || '없음'}`);

            // pushStatus 확인
            if (msg.pushStatus) {
                const status = msg.pushStatus;
                console.log(`      푸시 상태:`);
                console.log(`        - 전송 성공: ${status.sent ? '✅' : '❌'}`);
                console.log(`        - 성공 수: ${status.successCount || 0}`);
                console.log(`        - 실패 수: ${status.failureCount || 0}`);
                console.log(`        - 세부 정보: ${status.details || '없음'}`);
                if (status.error) {
                    console.log(`        - 오류: ${status.error}`);
                }
            } else {
                console.log(`      푸시 상태: ⏳ 처리 중 또는 미처리`);
            }

            // 해당 회원의 토큰 확인
            if (msg.memberId && tokensByMember[msg.memberId]) {
                console.log(`      회원 토큰 수: ${tokensByMember[msg.memberId].length}개`);
                tokensByMember[msg.memberId].forEach((t, idx) => {
                    console.log(`        ${idx + 1}. ${t.collection} - ${t.platform || 'unknown'} (갱신: ${t.updatedAt || '없음'})`);
                });
            } else if (msg.memberId) {
                console.log(`      ⚠️  경고: 이 회원의 FCM 토큰이 없습니다!`);
            }

            console.log('');
        }
    }

    // 4. 최근 공지사항 확인
    console.log('\n4️⃣  최근 공지사항 푸시 상태 확인 (최근 5개)...');
    const noticesSnapshot = await db.collection('notices')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    if (noticesSnapshot.empty) {
        console.log('   공지사항이 없습니다.\n');
    } else {
        noticesSnapshot.docs.forEach(noticeDoc => {
            const notice = noticeDoc.data();
            console.log(`   📢 공지: ${notice.title}`);

            if (notice.pushStatus) {
                console.log(`      푸시: ${notice.pushStatus.sent ? '✅ 전송됨' : '❌ 실패'}`);
                console.log(`      성공: ${notice.pushStatus.successCount || 0}, 실패: ${notice.pushStatus.failureCount || 0}`);
            } else {
                console.log(`      푸시: ⏳ 처리 중`);
            }
            console.log('');
        });
    }

    // 5. 권장 사항 출력
    console.log('\n5️⃣  권장 조치 사항:\n');

    if (ghostTokens.length > 0) {
        console.log(`   ⚠️  유령 토큰 ${ghostTokens.length}개 발견 - 정리 필요`);
    }

    // 중복 토큰 확인
    Object.entries(tokensByMember).forEach(([memberId, tokens]) => {
        if (tokens.length > 2) {
            console.log(`   ⚠️  회원 ${memberId}: ${tokens.length}개의 중복 토큰 (2개만 유지 권장)`);
        }
    });

    // 오래된 토큰 확인 (30일 이상)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleTokens = allTokens.filter(t => {
        if (!t.updatedAt) return true;
        const updated = new Date(t.updatedAt);
        return updated < thirtyDaysAgo;
    });

    if (staleTokens.length > 0) {
        console.log(`   ⚠️  ${staleTokens.length}개의 오래된 토큰 발견 (30일 이상 미갱신)`);
    }

    console.log('\n✅ 점검 완료!\n');
    process.exit(0);
}

debugPushNotifications().catch(error => {
    console.error('점검 중 오류 발생:', error);
    process.exit(1);
});

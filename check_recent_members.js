/**
 * 최근 가입한 회원 및 강사의 phoneLast4 필드 확인
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync('./functions/service-account-key.json', 'utf-8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkRecentMembers() {
    try {
        console.log('📋 최근 가입한 회원 조회 중...\n');

        // 최근 7일 내 가입한 회원 조회
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();

        const snapshot = await db.collection('members')
            .where('createdAt', '>=', sevenDaysAgoStr)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            console.log('⚠️ 최근 7일 내 가입한 회원이 없습니다.\n');
            console.log('💡 모든 회원 중 phoneLast4가 없는 회원을 찾습니다...\n');
            
            // phoneLast4가 없는 회원 찾기
            const allSnapshot = await db.collection('members').limit(100).get();
            const missingPhoneLast4 = [];
            
            allSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!data.phoneLast4 && data.phone) {
                    missingPhoneLast4.push({
                        id: doc.id,
                        name: data.name,
                        phone: data.phone,
                        createdAt: data.createdAt,
                        phoneLast4: data.phoneLast4
                    });
                }
            });
            
            if (missingPhoneLast4.length > 0) {
                console.log(`❌ phoneLast4가 누락된 회원: ${missingPhoneLast4.length}명\n`);
                console.log('='.repeat(80));
                missingPhoneLast4.forEach((member, idx) => {
                    console.log(`\n[${idx + 1}] 회원 ID: ${member.id}`);
                    console.log(`이름: ${member.name}`);
                    console.log(`전화번호: ${member.phone}`);
                    console.log(`전화번호 뒷4자리 (현재): ${member.phoneLast4 || '❌ 없음'}`);
                    console.log(`전화번호 뒷4자리 (계산): ${member.phone?.slice(-4) || 'N/A'}`);
                    console.log(`가입일: ${member.createdAt}`);
                    console.log('-'.repeat(80));
                });
            } else {
                console.log('✅ phoneLast4가 누락된 회원이 없습니다.\n');
            }
        } else {
            console.log(`✅ 최근 7일 내 가입한 회원: ${snapshot.size}명\n`);
            console.log('='.repeat(80));

            snapshot.docs.forEach((doc, idx) => {
                const data = doc.data();
                const hasPhoneLast4 = !!data.phoneLast4;
                
                console.log(`\n[${idx + 1}] 회원 ID: ${doc.id}`);
                console.log(`이름: ${data.name}`);
                console.log(`전화번호: ${data.phone}`);
                console.log(`전화번호 뒷4자리 (저장됨): ${data.phoneLast4 || '❌ 없음'}`);
                console.log(`전화번호 뒷4자리 (계산): ${data.phone?.slice(-4) || 'N/A'}`);
                console.log(`가입일: ${data.createdAt}`);
                console.log(`phoneLast4 필드: ${hasPhoneLast4 ? '✅ 있음' : '❌ 없음'}`);
                console.log('-'.repeat(80));
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function checkInstructors() {
    try {
        console.log('\n\n📋 강사 목록 확인 중...\n');
        
        const docSnap = await db.collection('settings').doc('instructors').get();
        
        if (!docSnap.exists) {
            console.log('❌ 강사 설정을 찾을 수 없습니다.\n');
            return;
        }

        const list = docSnap.data().list || [];
        console.log(`✅ 등록된 강사: ${list.length}명\n`);
        console.log('='.repeat(80));

        list.forEach((inst, idx) => {
            const instName = typeof inst === 'string' ? inst : inst.name;
            const instPhone = typeof inst === 'string' ? '' : (inst.phone || '');
            const instLast4 = typeof inst === 'string' ? '' : (inst.phoneLast4 || '');
            
            console.log(`\n[${idx + 1}] 강사명: ${instName}`);
            console.log(`전화번호: ${instPhone || 'N/A'}`);
            console.log(`전화번호 뒷4자리: ${instLast4 || '❌ 없음'}`);
            console.log(`전화번호 뒷4자리 (계산): ${instPhone?.slice(-4) || 'N/A'}`);
            console.log(`타입: ${typeof inst === 'string' ? 'String (구버전)' : 'Object'}`);
            console.log(`phoneLast4 필드: ${instLast4 ? '✅ 있음' : '❌ 없음'}`);
            console.log('-'.repeat(80));
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

(async () => {
    try {
        await checkRecentMembers();
        await checkInstructors();
        
        console.log('\n\n💡 권장 사항:');
        console.log('1. phoneLast4가 없는 회원/강사가 있다면 마이그레이션 스크립트를 실행하세요.');
        console.log('2. 스크립트 실행 명령: await storageService.migratePhoneLast4()');
        console.log('3. 또는 Firebase Console에서 수동으로 phoneLast4 필드를 추가하세요.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();

/**
 * 효원 강사의 정확한 데이터 확인
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

async function checkInstructorData() {
    try {
        console.log('📋 settings/instructors 문서 조회 중...\n');
        
        const docSnap = await db.collection('settings').doc('instructors').get();
        
        if (!docSnap.exists) {
            console.log('❌ 강사 설정을 찾을 수 없습니다.\n');
            return;
        }

        const list = docSnap.data().list || [];
        console.log(`총 ${list.length}명의 강사 등록됨\n`);
        console.log('='.repeat(80));

        // 효원 강사 찾기
        const hyowon = list.find(inst => {
            const name = typeof inst === 'string' ? inst : (inst.name || '');
            return name.includes('효원');
        });

        if (hyowon) {
            console.log('\n✅ 효원 강사 발견!\n');
            console.log('저장된 데이터:');
            console.log(JSON.stringify(hyowon, null, 2));
            console.log('\n상세 정보:');
            
            if (typeof hyowon === 'string') {
                console.log(`타입: String (구버전)`);
                console.log(`이름: "${hyowon}"`);
                console.log(`이름 길이: ${hyowon.length}자`);
                console.log(`전화번호: 없음`);
            } else {
                console.log(`타입: Object`);
                console.log(`이름: "${hyowon.name}"`);
                console.log(`이름 길이: ${hyowon.name?.length || 0}자`);
                console.log(`이름 (16진수): ${Buffer.from(hyowon.name || '', 'utf-8').toString('hex')}`);
                console.log(`전화번호: ${hyowon.phone || 'N/A'}`);
                console.log(`phoneLast4: ${hyowon.phoneLast4 || 'N/A'}`);
                console.log(`전화번호 뒷4자리 (계산): ${hyowon.phone?.slice(-4) || 'N/A'}`);
                
                // 숨겨진 문자 확인
                if (hyowon.name) {
                    const name = hyowon.name;
                    console.log('\n문자별 분석:');
                    for (let i = 0; i < name.length; i++) {
                        console.log(`  [${i}] "${name[i]}" (코드: ${name.charCodeAt(i)})`);
                    }
                }
            }
        } else {
            console.log('\n❌ 효원 강사를 찾을 수 없습니다!\n');
            console.log('전체 강사 목록:');
            list.forEach((inst, idx) => {
                const name = typeof inst === 'string' ? inst : (inst.name || '');
                console.log(`  [${idx + 1}] ${name}`);
            });
        }

        // 테스트: verifyInstructorV2Call 시뮬레이션
        console.log('\n\n🧪 로그인 시뮬레이션\n');
        console.log('='.repeat(80));
        
        const testName = '효원';
        const testLast4 = '9477';
        
        console.log(`입력값: 이름="${testName}", phoneLast4="${testLast4}"\n`);
        
        const trimmedName = testName.trim();
        const trimmedLast4 = testLast4.trim();
        const inputNameLower = trimmedName.toLowerCase();
        
        const matchedInstructor = list.find(inst => {
            const instName = (typeof inst === 'string' ? inst : inst.name || '').trim();
            const instNameLower = instName.toLowerCase();
            const instPhone = typeof inst === 'string' ? '' : (inst.phone || '');
            const instLast4 = (inst.phoneLast4 || instPhone.slice(-4) || '').trim();
            
            console.log(`\n검사: "${instName}"`);
            console.log(`  - instNameLower: "${instNameLower}"`);
            console.log(`  - inputNameLower: "${inputNameLower}"`);
            console.log(`  - instLast4: "${instLast4}"`);
            console.log(`  - trimmedLast4: "${trimmedLast4}"`);
            
            // 이름 매칭
            const nameMatch = instNameLower === inputNameLower || 
                              instNameLower.startsWith(inputNameLower) || 
                              instNameLower.includes(inputNameLower);
            
            console.log(`  - 이름 매칭: ${nameMatch}`);
            console.log(`  - 번호 매칭: ${instLast4 === trimmedLast4}`);
            console.log(`  - 최종 매칭: ${nameMatch && instLast4 === trimmedLast4}`);
            
            return nameMatch && instLast4 === trimmedLast4;
        });

        if (matchedInstructor) {
            console.log('\n✅ 로그인 성공!\n');
            console.log('매칭된 강사:', matchedInstructor);
        } else {
            console.log('\n❌ 로그인 실패!\n');
            console.log('매칭되는 강사를 찾을 수 없습니다.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

(async () => {
    try {
        await checkInstructorData();
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();

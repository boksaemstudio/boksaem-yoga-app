/**
 * 긴급 출석 등록 스크립트
 * 오늘(2026-04-14) 광흥창 오후 2시 마이솔 수업 - 13명 출석 처리
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found:', serviceAccountPath);
    process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const tenantDb = db.collection('studios').doc(STUDIO_ID);

// 출석 등록할 회원 명단
const memberNames = [
    '노효원', '엄명희', '문정훈', '류지원', '박미진',
    '허향무', '이수연', '성예린', '장민정', '백현경',
    '차신애', '정다솔', '나혜실'
];

// 수업 정보
const CLASS_NAME = '마이솔';
const BRANCH_ID = 'C'; // 광흥창
const CLASS_TIME = '14:00';
const TODAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD

async function registerAttendance() {
    console.log(`🏃 [긴급] ${TODAY} 광흥창 오후 2시 마이솔 수업 출석 등록 시작...`);
    console.log(`   회원 ${memberNames.length}명: ${memberNames.join(', ')}`);

    // 1. 먼저 회원 ID 찾기
    const membersSnap = await tenantDb.collection('members').get();
    const allMembers = [];
    membersSnap.forEach(doc => {
        const data = doc.data();
        allMembers.push({ id: doc.id, name: data.name, ...data });
    });

    console.log(`\n📋 전체 회원 수: ${allMembers.length}명`);

    // 이름으로 회원 매칭
    const matched = [];
    const notFound = [];
    
    for (const name of memberNames) {
        const found = allMembers.find(m => m.name === name);
        if (found) {
            matched.push(found);
        } else {
            // 부분 매칭 시도
            const partial = allMembers.find(m => m.name && m.name.includes(name));
            if (partial) {
                matched.push(partial);
                console.log(`   ⚠️ '${name}' → '${partial.name}' (부분 매칭)`);
            } else {
                notFound.push(name);
            }
        }
    }

    if (notFound.length > 0) {
        console.log(`\n❌ 매칭 실패 회원: ${notFound.join(', ')}`);
    }
    console.log(`✅ 매칭 성공: ${matched.length}명`);

    // 2. 출석 레코드 생성
    const batch = db.batch();
    const timestamp = new Date(`${TODAY}T${CLASS_TIME}:00+09:00`);
    let count = 0;

    for (const member of matched) {
        // 이미 오늘 이 시간에 출석한 기록이 있는지 확인
        const existingSnap = await tenantDb.collection('attendance')
            .where('memberId', '==', member.id)
            .where('className', '==', CLASS_NAME)
            .get();
        
        // 오늘자 중복 체크
        const todayDup = existingSnap.docs.find(d => {
            const ts = d.data().timestamp;
            const docDate = ts?.toDate ? ts.toDate() : new Date(ts);
            return docDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) === TODAY;
        });

        if (todayDup) {
            console.log(`   ⏭️ ${member.name} - 이미 오늘 출석 등록됨 (SKIP)`);
            continue;
        }

        const logId = tenantDb.collection('attendance').doc().id;
        batch.set(tenantDb.collection('attendance').doc(logId), {
            id: logId,
            memberId: member.id,
            memberName: member.name,
            branchId: BRANCH_ID,
            timestamp: admin.firestore.Timestamp.fromDate(timestamp),
            className: CLASS_NAME,
            instructor: '마이솔',
            status: 'approved',
            method: 'manual',
            note: '관리자 수동 등록 (2026-04-14 광흥창 오후2시 마이솔)'
        });
        count++;
        console.log(`   ✅ ${member.name} (${member.id.substring(0, 8)}...) 출석 등록`);
    }

    if (count > 0) {
        await batch.commit();
        console.log(`\n🎉 총 ${count}명 출석 등록 완료!`);
    } else {
        console.log('\n⚠️ 신규 등록할 출석이 없습니다 (모두 이미 등록됨)');
    }

    // 3. 결과 요약
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 출석 등록 결과 보고');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  날짜: ${TODAY}`);
    console.log(`  지점: 광흥창`);
    console.log(`  수업: 마이솔 (오후 2시)`);
    console.log(`  등록 완료: ${count}명`);
    console.log(`  매칭 실패: ${notFound.length}명 ${notFound.length > 0 ? '(' + notFound.join(', ') + ')' : ''}`);
    console.log(`  이미 등록: ${matched.length - count}명`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

registerAttendance().catch(console.error).finally(() => process.exit(0));

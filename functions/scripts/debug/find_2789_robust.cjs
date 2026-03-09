const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function findMemberAndLog() {
    try {
        console.log('--- 모든 회원 정보 중 2789 검색 ---');
        const allMembers = await db.collection('members').get();
        let foundMember = null;
        allMembers.forEach(doc => {
            const m = doc.data();
            if (m.pin == '2789' || (m.phone && m.phone.includes('2789'))) {
                console.log(`발견: ID: ${doc.id}, Name: ${m.name}, PIN: ${m.pin}, Phone: ${m.phone}, FaceData: ${!!m.faceDescriptor}`);
                foundMember = { id: doc.id, ...m };
            }
        });

        if (!foundMember) {
            console.log('PIN 또는 전화번호에 2789가 포함된 회원을 찾을 수 없습니다.');
            // 전체 회원 중 최근에 faceDescriptor가 추가된 회원이 있는지 확인
            console.log('\n--- 최근 faceDescriptor가 추가/수정된 회원 ---');
            const recentFaceMembers = await db.collection('members')
                .where('faceDescriptor', '!=', null)
                .limit(10)
                .get();
            recentFaceMembers.forEach(doc => {
                const m = doc.data();
                console.log(`Name: ${m.name}, PIN: ${m.pin}, MemberId: ${doc.id}`);
            });
        } else {
            console.log(`\n--- ${foundMember.name} 회원의 최근 출석 로그 ---`);
            const logs = await db.collection('attendance')
                .where('memberId', '==', foundMember.id)
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();
            logs.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)).toLocaleString('ko-KR') : 'N/A';
                console.log(`[${date}] facialMatched: ${data.facialMatched || false}, status: ${data.status}`);
            });
        }

    } catch (err) {
        console.error('에러 발생:', err);
    } finally {
        process.exit();
    }
}

findMemberAndLog();

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMember2789() {
    try {
        console.log('--- PIN 2789 회원 검색 ---');
        const membersSnapshot = await db.collection('members')
            .where('pin', '==', '2789')
            .get();

        if (membersSnapshot.empty) {
            console.log('PIN 2789인 회원을 찾을 수 없습니다.');
            return;
        }

        const member = membersSnapshot.docs[0];
        const memberId = member.id;
        const memberData = member.data();
        console.log(`회원명: ${memberData.name} (ID: ${memberId})`);
        console.log(`안면 데이터(faceDescriptor) 보유 여부: ${!!memberData.faceDescriptor}`);
        
        console.log('\n--- 최근 출석 로그 (최근 5건) ---');
        const attendanceSnapshot = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        if (attendanceSnapshot.empty) {
            console.log('출석 로그가 없습니다.');
        }

        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'N/A';
            console.log(`[${date}] facialMatched: ${data.facialMatched || false}, status: ${data.status}`);
        });

    } catch (err) {
        console.error('에러 발생:', err);
    } finally {
        process.exit();
    }
}

checkMember2789();

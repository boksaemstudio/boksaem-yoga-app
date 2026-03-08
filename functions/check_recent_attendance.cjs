const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkRecentAttendance() {
    try {
        console.log('--- 최근 출석 로그 (최근 10건) ---');
        const attendanceSnapshot = await db.collection('attendance')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const memberIds = new Set();
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'N/A';
            console.log(`[${date}] memberId: ${data.memberId}, facialMatched: ${data.facialMatched || false}, status: ${data.status}`);
            memberIds.add(data.memberId);
        });

        console.log('\n--- 해당 회원 정보 ---');
        for (const id of memberIds) {
            const memberDoc = await db.collection('members').doc(id).get();
            if (memberDoc.exists) {
                const m = memberDoc.data();
                console.log(`ID: ${id}, Name: ${m.name}, PIN: ${m.pin}, FaceData: ${!!m.faceDescriptor}`);
            } else {
                console.log(`ID: ${id} (회원 정보 없음)`);
            }
        }

    } catch (err) {
        console.error('에러 발생:', err);
    } finally {
        process.exit();
    }
}

checkRecentAttendance();

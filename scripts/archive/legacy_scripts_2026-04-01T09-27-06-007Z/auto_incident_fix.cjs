const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        console.log("=== 1. 정계수 오후 잘못된 출석(안면인식 오작동) 3건 삭제 및 횟수 복구 ===");
        const attSnap = await db.collection('studios/boksaem-yoga/attendance')
            .where('date', '==', '2026-03-30')
            .where('memberName', '==', '정계수')
            .get();
        
        let deletedCount = 0;
        let memberIdToRestore = null;
        for (const doc of attSnap.docs) {
            const data = doc.data();
            // 오후 출석 기록만 삭제 (KST 기준 UTC+9 -> UTC 03:00~ 이후)
            if (data.timestamp) {
                const tsDate = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                const hour = tsDate.getUTCHours();
                if (hour >= 3) { // 12:00 PM KST = 03:00 UTC
                    console.log(`Deleting false attendance: ${tsDate}`);
                    await doc.ref.delete();
                    deletedCount++;
                    memberIdToRestore = data.memberId;
                }
            }
        }
        
        if (memberIdToRestore && deletedCount > 0) {
            const memberRef = db.doc(`studios/boksaem-yoga/members/${memberIdToRestore}`);
            await memberRef.update({
                credits: admin.firestore.FieldValue.increment(deletedCount),
                attendanceCount: admin.firestore.FieldValue.increment(-deletedCount)
            });
            console.log(`Restored ${deletedCount} credits to 정계수. Decrease attendanceCount by ${deletedCount}.`);
        } else {
            console.log("No false attendance records found for 정계수 in the afternoon.");
        }

        console.log("\n=== 2. 잘못 들어간 데모 공지사항 삭제 ===");
        const fakeTitles = [
            '3월 한정! 신규 가입 시 3개월권 20% 할인 이벤트를 진행합니다.',
            '4월부터 \'모닝 빈야사\' 수업이 07:00 -> 08:30으로 변경됩니다.'
        ];
        const noticeSnap = await db.collection('studios/boksaem-yoga/notices')
            .where('title', 'in', fakeTitles)
            .get();
            
        let noticeDeleted = 0;
        for (const doc of noticeSnap.docs) {
            await doc.ref.delete();
            noticeDeleted++;
        }
        console.log(`Deleted ${noticeDeleted} fake demo notices from boksaem-yoga.`);

    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();

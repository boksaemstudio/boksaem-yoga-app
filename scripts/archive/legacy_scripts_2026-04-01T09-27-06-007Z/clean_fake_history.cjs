const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    // 1. Delete fake push_history records from boksaem-yoga
    const fakeIds = [
        '2IvvzqLk0LG791QIXUQ3', // [이벤트] 신규 회원 등록 할인
        'JHwF6xL5YcbdAmlZdf7u', // [안내] 4월 수업 시간표 변경 공지
        'TzqFVyJnX57pEqcadO2o', // [공지] 봄맞이 패스플로우 데모 업데이트 안내
    ];
    for (const id of fakeIds) {
        await db.doc(`studios/boksaem-yoga/push_history/${id}`).delete();
        console.log(`Deleted fake push_history: ${id}`);
    }

    // 2. Also delete duplicate wine yoga entries if they exist
    const phSnap = await db.collection('studios/boksaem-yoga/push_history').get();
    let dupeCount = 0;
    const seenTitles = new Set();
    for (const doc of phSnap.docs) {
        const data = doc.data();
        const title = data.title || '';
        if (title.includes('봄맞이') || title.includes('신규 회원 등록 할인') || title.includes('4월 수업 시간표 변경')) {
            await doc.ref.delete();
            dupeCount++;
            console.log(`Deleted extra fake: ${title}`);
        }
    }

    // 3. Delete failed SMS test records too
    const failedSnap = await db.collection('studios/boksaem-yoga/push_history')
        .where('status', '==', 'failed').get();
    let failCount = 0;
    for (const doc of failedSnap.docs) {
        const data = doc.data();
        if (data.body && data.body.includes('뿌리오 테스트')) {
            await doc.ref.delete();
            failCount++;
            console.log(`Deleted failed test SMS record: ${doc.id}`);
        }
    }

    console.log(`\nTotal: ${fakeIds.length + dupeCount} fake notices + ${failCount} failed test SMS records deleted.`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });

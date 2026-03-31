const admin = require('firebase-admin');
const sa = require('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        console.log("Starting correction script...");
        const batch = db.batch();
        // 타겟: 모든 3월 30일 마포점 출석 데이터
        const snap = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
            .where('date', '==', '2026-03-30')
            .where('branchId', '==', 'mapo')
            .get();

        let count = 0;
        snap.forEach(doc => {
            const data = doc.data();
            let newInstructor = data.instructor;
            
            // 1. 기존에 잘못 넣었던 '솜이' -> '슬미'로 수정
            if (newInstructor === '솜이') {
                newInstructor = '슬미';
            }
            
            // 2. 시간이 18:40, 19:50인 경우 '현아'로 수정
            // restored 데이터는 classTime 필드로 시간을 가지고 있음
            const time = data.classTime || '';
            const cName = data.className || '';
            
            if (time === '18:40' || time === '19:50') {
                newInstructor = '현아';
            } else if (cName.includes('플라잉')) {
                newInstructor = '슬미';
            }
            
            if (newInstructor !== data.instructor) {
                batch.update(doc.ref, { instructor: newInstructor });
                console.log(`Updated ${doc.id}: ${data.instructor} -> ${newInstructor}`);
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            console.log(`Updated instructors for ${count} records.`);
        } else {
            console.log('No instructors needed updating.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

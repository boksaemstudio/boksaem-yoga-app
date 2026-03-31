const admin = require('firebase-admin');
const sa = require('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        // 1. 일일 시간표 불러오기
        const scheduleSnap = await db.collection('studios').doc('boksaem-yoga').collection('daily_classes').doc('mapo_2026-03-30').get();
        if (!scheduleSnap.exists) {
            console.error("Mapo 3/30 daily schedule not found!");
            process.exit(1);
        }
        
        const scheduleData = scheduleSnap.data();
        const classesOn30th = scheduleData.classes || [];
        
        if (!classesOn30th || classesOn30th.length === 0) {
            console.error("No classes found for Mapo on 30th!");
            process.exit(1);
        }
        
        console.log("Found Schedule for 3/30:");
        classesOn30th.forEach(c => console.log(`- ${c.time} ${c.title} -> ${c.instructor}`));

        // 2. 복구된 출석 데이터 불러오기
        const batch = db.batch();
        const snap = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
            .where('date', '==', '2026-03-30')
            .where('branchId', '==', 'mapo')
            .where('method', '==', 'system_restore')
            .get();

        let count = 0;
        snap.forEach(doc => {
            const data = doc.data();
            
            // 시간표에서 현재 출석 기록의 시간과 일치하는 수업을 찾음
            const matchedClass = classesOn30th.find(c => c.time === data.classTime);
            
            if (matchedClass) {
                const realInstructor = matchedClass.instructor;
                if (data.instructor !== realInstructor) {
                    batch.update(doc.ref, { instructor: realInstructor });
                    console.log(`Updated ${doc.id}: ${data.classTime} ${data.className} -> ${realInstructor} 선생님 배정 완료 (이전: ${data.instructor})`);
                    count++;
                }
            } else {
                 console.log(`No schedule match for attendance log: ${data.classTime} ${data.className}`);
            }
        });
        
        if (count > 0) {
            await batch.commit();
            console.log(`Successfully mapped real instructors for ${count} records!`);
        } else {
            console.log('No records needed updating.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkSchedule() {
    console.log("=== 2월 스케줄 진단 시작 ===\n");

    const branches = ['gwangheungchang', 'mapo'];
    
    for (const branchId of branches) {
        console.log(`--- ${branchId} ---`);
        
        // 1. Check monthly_schedules meta document
        const metaDocId = `${branchId}_2026_2`;
        const metaRef = db.collection('monthly_schedules').doc(metaDocId);
        const metaSnap = await metaRef.get();
        
        if (metaSnap.exists) {
            console.log(`  [monthly_schedules/${metaDocId}] 존재함`);
            console.log(`    isSaved: ${metaSnap.data().isSaved}`);
            console.log(`    fields: ${JSON.stringify(Object.keys(metaSnap.data()))}`);
        } else {
            console.log(`  [monthly_schedules/${metaDocId}] 존재하지 않음`);
        }

        // 2. Check daily_classes for first 5 days of Feb
        for (let d = 1; d <= 5; d++) {
            const dateStr = `2026-02-${String(d).padStart(2, '0')}`;
            const dailyRef = db.collection('daily_classes').doc(`${branchId}_${dateStr}`);
            const dailySnap = await dailyRef.get();
            
            if (dailySnap.exists) {
                const data = dailySnap.data();
                const classCount = data.classes ? data.classes.length : 0;
                console.log(`  [daily_classes/${branchId}_${dateStr}] 존재 (수업 ${classCount}개)`);
            } else {
                console.log(`  [daily_classes/${branchId}_${dateStr}] 없음`);
            }
        }

        // 3. Check images (timetable)
        const imgKey = `timetable_${branchId}_2026-02`;
        const imgRef = db.collection('images').doc(imgKey);
        const imgSnap = await imgRef.get();
        console.log(`  [images/${imgKey}] ${imgSnap.exists ? '존재함' : '없음'}`);
        
        const fallbackKey = `timetable_${branchId}`;
        const fbSnap = await db.collection('images').doc(fallbackKey).get();
        console.log(`  [images/${fallbackKey}] ${fbSnap.exists ? '존재함' : '없음'}`);
        
        console.log('');
    }

    // 4. List all monthly_schedules docs
    console.log("--- 전체 monthly_schedules 문서 목록 ---");
    const allMeta = await db.collection('monthly_schedules').get();
    if (allMeta.empty) {
        console.log("  (비어있음)");
    } else {
        allMeta.docs.forEach(doc => {
            console.log(`  ${doc.id}: isSaved=${doc.data().isSaved}`);
        });
    }

    console.log("\n=== 진단 완료 ===");
    process.exit(0);
}

checkSchedule().catch(e => { console.error(e); process.exit(1); });

const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}

const db = admin.firestore();
const tenantDb = db.doc('studios/demo-yoga');

async function fixDemoAll() {
    console.log('--- 1. Resetting Branches Config ---');
    // Ensure the ROOT config has only one branch!
    await tenantDb.set({
        BRANCHES: [
            { id: 'main', name: '본점', isMain: true, color: 'var(--primary-theme-color)' }
        ]
    }, { merge: true });

    // Also settings/branch
    await tenantDb.collection('settings').doc('branch').set({
        branches: [
            { id: 'main', name: '본점', isMain: true, color: 'var(--primary-theme-color)' }
        ]
    }, { merge: true });

    console.log('--- 2. Filling Missing Timetable Images ---');
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = (nextDate.getMonth() + 1).toString().padStart(2, '0');
    
    // Set some realistic placeholder images for timetable images
    await tenantDb.collection('settings').doc('images').set({
        [`timetable_main_${curYear}-${curMonth}`]: '/assets/features_kiosk_demo.webp',
        [`timetable_main_${nextYear}-${nextMonth}`]: '/assets/features_kiosk_demo.webp'
    }, { merge: true });


    console.log('--- 3. Fixing Attendance ClassTime grouping ---');
    const attendanceSnap = await tenantDb.collection('attendance').get();
    let batch = db.batch();
    let count = 0;

    for (const doc of attendanceSnap.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updates = {};
        
        // If it doesn't have classTime, we need to inject it so LogsTab can group them!
        if (!data.classTime && data.timestamp) {
            const d = new Date(data.timestamp);
            let h = d.getHours();
            let m = d.getMinutes();
            // Round to nearest 30 mins
            if (m > 45) { h += 1; m = 0; }
            else if (m >= 15 && m <= 45) { m = 30; }
            else { m = 0; }
            
            const guessedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            updates.classTime = guessedTime;
            needsUpdate = true;
        }

        // Set missing branchId to main just in case
        if (data.branchId !== 'main') {
            updates.branchId = 'main';
            needsUpdate = true;
        }

        if (needsUpdate) {
            batch.update(doc.ref, updates);
            count++;
            if (count >= 400) {
                await batch.commit();
                batch = db.batch();
                count = 0;
                console.log('Committed batch...');
            }
        }
    }
    if (count > 0) {
        await batch.commit();
        console.log('Committed last batch...');
    }


    console.log('--- 4. Seeding Push History (알림기록) ---');
    const pushId = tenantDb.collection('push_history').doc().id;
    await tenantDb.collection('push_history').doc(pushId).set({
        id: pushId,
        title: '[공지] 3월 스튜디오 운영시간 변경 안내',
        body: '회원님, 3월부터 평일 저녁 마지막 수업 시간이 21시 30분으로 변경됩니다. 예약에 참고 부탁드립니다.',
        target: 'all',
        targetCount: 120,
        createdAt: new Date().toISOString(),
        successCount: 118,
        failCount: 2,
        managerId: 'admin'
    });


    console.log('--- 5. Seeding Trash (휴지통) ---');
    const trashId = tenantDb.collection('trash').doc().id;
    await tenantDb.collection('trash').doc(trashId).set({
        id: trashId,
        type: 'member',
        originalId: 'del-member-01',
        data: { name: '이민호', phone: '010-9999-8888', originalCredits: 10, credits: 2 },
        deletedAt: new Date().toISOString(),
        deletedBy: '관리자',
        reason: '계정 삭제(사용자 요청)'
    });

    console.log('ALL FIXES COMPLETED!');
}

fixDemoAll()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: 'boksaem-yoga'
    });
}
const db = admin.firestore();

const year = 2026;
const month = 4; // April

const scheduleData = {
  "regular_schedule": [
    { "days": ["월"], "slot": "10:00", "class": "하타", "instructor": "지유" },
    { "days": ["화"], "slot": "10:00", "class": "아쉬탕가", "instructor": "혜경" },
    { "days": ["수"], "slot": "10:00", "class": "빈야사", "instructor": "지유" },
    { "days": ["목"], "slot": "10:00", "class": "아쉬탕가 마이솔", "instructor": "혜경", "open_notice": "30분전 open" },
    { "days": ["금"], "slot": "10:00", "class": "하타", "instructor": "지유" },
    { "days": ["월", "수"], "slot": "12:00", "class": "아쉬탕가 마이솔", "instructor": "혜경", "open_notice": "30분전 open" },
    { "days": ["월", "화", "수", "목"], "slot": "18:30", "class": "아쉬탕가 마이솔", "instructor": "혜경", "open_notice": "30분전 open", "entry_deadline": "19:10" },
    { "days": ["월"], "slot": "20:30", "class": "하타", "instructor": "하영" },
    { "days": ["화"], "slot": "20:30", "class": "아쉬탕가", "instructor": "혜경" },
    { "days": ["수"], "slot": "20:30", "class": "빈야사", "instructor": "하영" },
    { "days": ["목"], "slot": "20:30", "class": "아쉬탕가", "instructor": "혜경" },
    { "days": ["금"], "slot": "20:30", "class": "하타", "instructor": "나라" }
  ],
  "special_date_classes": [
    { "days": ["토"], "grid_slot": "14:00", "class": "아쉬탕가 마이솔", "instructor": "혜경", "dates": [4, 18], "actual_time": "14:00", "reservation_only": true },
    { "days": ["토"], "grid_slot": "10:00", "class": "하타", "instructor": "예선", "dates": [11, 25], "actual_time": "10:00", "reservation_only": true },
    { "days": ["일"], "grid_slot": "11:00", "class": "아쉬탕가 LED(구령)", "instructor": "혜경", "dates": [12, 26], "actual_time": "11:00", "reservation_only": true }
  ]
};

async function seed() {
    const tenantId = 'ssangmun-yoga';
    // THE FIX: The UI uses 'main' as default branch ID, NOT tenantId!
    const targetBranchId = 'main'; 

    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        dates.push(new Date(year, month - 1, d));
    }
    const dayStr = ["일", "월", "화", "수", "목", "금", "토"];
    const batch = db.batch();
    
    // Set root monthly schedule doc
    const metaRef = db.collection('studios').doc(tenantId).collection('monthly_schedules').doc(`${targetBranchId}_${year}_${month}`);
    batch.set(metaRef, {
        branchId: targetBranchId,
        year, 
        month,
        isSaved: true,
        createdAt: new Date().toISOString()
    }, { merge: true });

    let count = 0;
    
    for (const date of dates) {
        const dd = date.getDate();
        const dStr = dayStr[date.getDay()];
        const dateString = `${year}-${month.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`;
        const dailyClasses = [];

        for (const reg of scheduleData.regular_schedule) {
            if (reg.days.includes(dStr)) {
                if (!reg.slot) continue;
                const timeStr = reg.slot.split('~')[0]; 
                let baseMinutes = reg.class.includes('마이솔') ? 90 : 60;
                
                let payload = {
                    time: timeStr,
                    title: reg.class,
                    className: reg.class,
                    instructor: reg.instructor || '지정안됨',
                    status: 'normal',
                    duration: baseMinutes
                };
                if (reg.open_notice) payload.openNotice = reg.open_notice;
                if (reg.entry_deadline) payload.entryDeadline = reg.entry_deadline;
                dailyClasses.push(payload);
            }
        }
        
        for (const spc of scheduleData.special_date_classes) {
            if (spc.dates.includes(dd)) {
                const timeStr = spc.actual_time || spc.grid_slot; 
                let baseMinutes = spc.class.includes('마이솔') ? 90 : 60;
                dailyClasses.push({
                    time: timeStr,
                    title: spc.class,
                    className: spc.class,
                    instructor: spc.instructor || '지정안됨',
                    status: 'normal',
                    duration: baseMinutes,
                    isSpecial: true,
                    reservationOnly: !!spc.reservation_only
                });
            }
        }
        
        // Push daily document with branchId: 'main'
        if (dailyClasses.length > 0) {
            dailyClasses.sort((a,b) => a.time.localeCompare(b.time));
            const docId = `${targetBranchId}_${dateString}`;
            const docRef = db.collection('studios').doc(tenantId).collection('daily_classes').doc(docId);
            batch.set(docRef, {
                branchId: targetBranchId,
                date: dateString,
                classes: dailyClasses,
                updatedAt: new Date().toISOString()
            });
            count += dailyClasses.length;
        }
    }

    await batch.commit();
    console.log(`Successfully seeded ${count} classes for Ssangmun Yoga in DAILY_CLASSES (branchId='main')!`);
}
seed().catch(console.error);

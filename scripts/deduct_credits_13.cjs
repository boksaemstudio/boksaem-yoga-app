const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function deductCredits() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    // The exact 13 members
    const memberNames = [
        '허향무', '노효원ttc2기', '엄명희', '장민정', '류지원', 
        '문정훈ttc6기', '이수연', '정다솔', '박미진', '성예린ttc9기', 
        '차신애', '나혜실ttc6기', '백현경'
    ];
    
    // First, find the members
    const membersSnap = await tenantDb.collection('members').where('name', 'in', memberNames.slice(0, 10)).get();
    const membersSnap2 = await tenantDb.collection('members').where('name', 'in', memberNames.slice(10)).get();
    
    const docs = [...membersSnap.docs, ...membersSnap2.docs];
    
    const batch = db.batch();
    let count = 0;
    const updateLogs = [];

    for (const doc of docs) {
        const data = doc.data();
        let credits = Number(data.credits || 0);
        let attendanceCount = Number(data.attendanceCount || 0);
        
        let newCredits = credits > 0 ? credits - 1 : 0;
        let newAttendanceCount = attendanceCount + 1;
        
        batch.update(doc.ref, {
            credits: newCredits,
            attendanceCount: newAttendanceCount,
            lastAttendance: new Date().toISOString()
        });
        updateLogs.push(`- ${data.name}: 횟수 ${credits} → ${newCredits}, 출석수 ${attendanceCount} → ${newAttendanceCount}`);
        count++;
    }

    if (count > 0) {
        await batch.commit();
        console.log(`✅ ${count}명 회원 횟수 차감 및 출석 횟수 증가 완료!`);
        console.log(updateLogs.join('\n'));
    } else {
        console.log("처리할 회원이 없습니다.");
    }
}

deductCredits().catch(console.error).finally(()=>process.exit(0));

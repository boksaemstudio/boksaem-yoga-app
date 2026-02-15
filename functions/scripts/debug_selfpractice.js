const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAttendance() {
    const today = '2026-02-15';
    
    // 1. Get ALL self-practice records today
    console.log('=== Querying all self-practice records for', today, '===\n');
    const selfSnap = await db.collection('attendance')
        .where('date', '==', today)
        .where('className', '==', '\uC790\uC728\uC218\uB828')
        .get();
    
    console.log('Total self-practice records:', selfSnap.size);
    selfSnap.docs.forEach(d => {
        const data = d.data();
        const ts = data.timestamp ? new Date(data.timestamp) : null;
        const kstTime = ts ? ts.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
        console.log(`  ID: ${d.id} | ${data.memberName} | KST: ${kstTime} | branch: ${data.branchId}`);
    });

    // 2. Also check for 김태연
    console.log('\n=== Checking 김태연 ===');
    const taeyeonSnap = await db.collection('members').where('name', '==', '\uAE40\uD0DC\uC5F0').get();
    if (taeyeonSnap.empty) {
        console.log('  김태연 member NOT FOUND');
    } else {
        for (const doc of taeyeonSnap.docs) {
            console.log('  Member ID:', doc.id, '| Branch:', doc.data().branch, '| Phone4:', doc.data().phoneLast4);
            const attSnap = await db.collection('attendance')
                .where('memberId', '==', doc.id)
                .where('date', '==', today)
                .get();
            if (attSnap.empty) {
                console.log('  No attendance for today');
            } else {
                attSnap.docs.forEach(a => {
                    const ad = a.data();
                    const ts2 = ad.timestamp ? new Date(ad.timestamp) : null;
                    const kst2 = ts2 ? ts2.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    console.log(`  Attendance: ID=${a.id} | KST: ${kst2} | class: ${ad.className} | instructor: ${ad.instructor} | branch: ${ad.branchId}`);
                });
            }
        }
    }

    // 3. Get schedule for reference
    console.log('\n=== Schedule Reference ===');
    const ghcSnap = await db.collection('daily_classes').doc('gwangheungchang_' + today).get();
    const mapoSnap = await db.collection('daily_classes').doc('mapo_' + today).get();
    
    if (ghcSnap.exists) {
        console.log('gwangheungchang:', (ghcSnap.data().classes || []).map(c => `${c.time} ${c.title}(${c.instructor})`).join(', '));
    }
    if (mapoSnap.exists) {
        console.log('mapo:', (mapoSnap.data().classes || []).map(c => `${c.time} ${c.title}(${c.instructor})`).join(', '));
    }

    console.log('\n=== Ready for fixes ===');
    process.exit(0);
}

fixAttendance().catch(e => { console.error(e); process.exit(1); });

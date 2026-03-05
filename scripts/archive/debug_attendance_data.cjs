const admin = require('firebase-admin');

// Initialize admin with default credentials
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

async function debug() {
    console.log('--- Debugging Attendance Data ---');
    const today = '2026-02-15';

    // 1. Check Kim Hee-jung (김희정) 010-4020-6017
    console.log('\n[1] Checking Kim Hee-jung duplicates...');
    const khjSnap = await db.collection('members')
        .where('name', '==', '김희정')
        .where('phoneLast4', '==', '6017')
        .get();
    
    if (khjSnap.empty) {
        console.log('Member 김희정 (6017) not found.');
    } else {
        const khj = khjSnap.docs[0];
        console.log(`Member found: ${khj.id}, Name: ${khj.data().name}, Credits: ${khj.data().credits}`);
        
        const attendanceSnap = await db.collection('attendance')
            .where('memberId', '==', khj.id)
            .where('date', '==', today)
            .get();
        
        console.log(`Attendance records for today: ${attendanceSnap.size}`);
        attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(` - ID: ${doc.id}, Time: ${data.timestamp}, Class: ${data.className}, Status: ${data.status}`);
        });
    }

    // 2. Check Lee Su-yeon (이수연) 010-9496-1748
    console.log('\n[2] Checking Lee Su-yeon count issue...');
    const lsySnap = await db.collection('members')
        .where('name', '==', '이수연')
        .where('phoneLast4', '==', '1748')
        .get();
    
    if (lsySnap.empty) {
        console.log('Member 이수연 (1748) not found.');
    } else {
        const lsy = lsySnap.docs[0];
        console.log(`Member found: ${lsy.id}, Name: ${lsy.data().name}, Credits: ${lsy.data().credits}, AttendanceCount: ${lsy.data().attendanceCount}`);
        
        const attendanceSnap = await db.collection('attendance')
            .where('memberId', '==', lsy.id)
            .where('date', '==', today)
            .get();
        
        console.log(`Attendance records for today: ${attendanceSnap.size}`);
        attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(` - ID: ${doc.id}, Time: ${data.timestamp}, Class: ${data.className}, Status: ${data.status}, Credits: ${data.credits}`);
        });
    }

    // 3. Check Gwangheungchang (광흥창점) schedule
    console.log('\n[3] Checking Gwangheungchang schedule...');
    const branchId = 'gwangheungchang';
    const scheduleRef = db.collection('daily_classes').doc(`${branchId}_${today}`);
    const scheduleSnap = await scheduleRef.get();
    
    if (!scheduleSnap.exists) {
        console.log('No daily schedule for gwangheungchang today.');
    } else {
        console.log('Daily classes:');
        scheduleSnap.data().classes.forEach(c => {
            console.log(` - ${c.time} [${c.className}] ${c.instructor} (status: ${c.status})`);
        });
    }
}

debug().catch(console.error);

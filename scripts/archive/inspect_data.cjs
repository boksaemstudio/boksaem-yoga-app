const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize with service account
const serviceAccountPath = path.join(__dirname, 'functions/service-account-key.json');

if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} else {
    // Fallback if file not found (though we know it exists)
    if (admin.apps.length === 0) admin.initializeApp();
}

const db = admin.firestore();

async function inspect() {
    let output = '--- Inspection Results ---\n';
    const today = '2026-02-15'; // Today's date KST

    try {
        // 1. Kim Hee-jung
        output += '\n[1] Kim Hee-jung (6017)\n';
        const khjSnap = await db.collection('members').where('phoneLast4', '==', '6017').get();
        for (const doc of khjSnap.docs) {
            const d = doc.data();
            output += `ID: ${doc.id}, Name: ${d.name}, Credits: ${d.credits}, Count: ${d.attendanceCount}\n`;
            const attSnap = await db.collection('attendance')
                .where('memberId', '==', doc.id)
                .where('date', '==', today)
                .get();
            
            // Sort in memory to avoid index requirement
            const records = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            output += `Attendance for ${today} (${records.length} records):\n`;
            records.forEach(ad => {
                output += ` - ID: ${ad.id}, Time: ${ad.timestamp}, Class: ${ad.className}, Status: ${ad.status}, Credits: ${ad.credits}\n`;
            });
        }

        // 2. Lee Su-yeon
        output += '\n[2] Lee Su-yeon (1748)\n';
        const lsySnap = await db.collection('members').where('phoneLast4', '==', '1748').get();
        for (const doc of lsySnap.docs) {
            const d = doc.data();
            output += `ID: ${doc.id}, Name: ${d.name}, Credits: ${d.credits}, Count: ${d.attendanceCount}\n`;
            const attSnap = await db.collection('attendance')
                .where('memberId', '==', doc.id)
                .where('date', '==', today)
                .get();
            output += `Attendance for ${today} (${attSnap.size} records):\n`;
            attSnap.docs.forEach(a => {
                const ad = a.data();
                output += ` - ID: ${a.id}, Time: ${ad.timestamp}, Class: ${ad.className}, Status: ${ad.status}, Credits: ${ad.credits}\n`;
            });
        }

        // 3. Gwangheungchang Schedule
        output += `\n[3] Gwangheungchang Schedule (${today})\n`;
        const scheduleRef = db.collection('daily_classes').doc(`gwangheungchang_${today}`);
        const scheduleSnap = await scheduleRef.get();
        if (scheduleSnap.exists) {
            const classes = scheduleSnap.data().classes || [];
            output += `Classes found: ${classes.length}\n`;
            classes.sort((a,b) => a.time.localeCompare(b.time)).forEach(c => {
                output += ` - ${c.time} [${c.className || c.title}] ${c.instructor} (Status: ${c.status})\n`;
            });
        } else {
            output += `No daily_classes document found for gwangheungchang_${today}.\n`;
        }

        fs.writeFileSync('inspection_result.txt', output);
        console.log('Inspection complete. Results written to inspection_result.txt');

    } catch (e) {
        console.error("Error details:", e);
        fs.writeFileSync('inspection_result.txt', `Error: ${e.message}\n${e.stack}`);
    }
}

inspect();

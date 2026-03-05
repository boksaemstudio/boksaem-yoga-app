var admin = require("firebase-admin");
var serviceAccount = require("../service-account-key.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  if (!admin.apps.length)
    admin.initializeApp();
}

const db = admin.firestore();

// Mock getKSTTotalMinutes for specific times
function getKSTTotalMinutesAt(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

async function verifyMatching() {
    const today = "2026-02-15";
    const branchId = "gwangheungchang";
    const docId = `${branchId}_${today}`;
    
    console.log(`=== VERIFYING MATCHING FOR ${docId} ===`);
    
    const snap = await db.collection('daily_classes').doc(docId).get();
    const classes = snap.data().classes;
    
    const testTimes = ["13:14", "13:30", "13:42", "13:59"];

    testTimes.forEach(time => {
        const currentMinutes = getKSTTotalMinutesAt(time);
        let selectedClass = null;
        
        // Simplified but faithful matching logic from storage.js
        const sorted = [...classes].sort((a, b) => a.time.localeCompare(b.time));
        
        for (let i = 0; i < sorted.length; i++) {
            const cls = sorted[i];
            const [h, m] = cls.time.split(':').map(Number);
            const startMinutes = h * 60 + m;
            const duration = cls.duration || 60;
            const endMinutes = startMinutes + duration;

            if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
                selectedClass = cls;
                break;
            }
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                selectedClass = cls; // Simplified
                break;
            }
            if (currentMinutes >= startMinutes - 60 && currentMinutes < startMinutes - 30) {
                selectedClass = cls;
                break;
            }
        }

        console.log(`Time ${time}: Matched -> ${selectedClass ? `${selectedClass.title} [Instructor: ${selectedClass.instructor}]` : 'NONE'}`);
    });
}

verifyMatching().catch(console.error);

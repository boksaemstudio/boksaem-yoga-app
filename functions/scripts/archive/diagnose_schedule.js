
const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json');

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function diagnoseDailyClasses() {
    console.log("=== DIAGNOSING DAILY_CLASSES COLLECTION ===\n");

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`Current Date (KST): ${today}\n`);

    // Check today's classes for all branches
    const branches = ['gwangheungchang', 'mapo'];

    for (const branchId of branches) {
        const docId = `${branchId}_${today}`;
        const docRef = db.collection('daily_classes').doc(docId);

        try {
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                console.log(`✅ Found schedule for ${branchId} (${docId}):`);
                console.log(`   Classes: ${data.classes ? data.classes.length : 0}`);
                if (data.classes && data.classes.length > 0) {
                    data.classes.forEach((cls, i) => {
                        console.log(`   [${i + 1}] ${cls.time || 'N/A'} - ${cls.title || cls.name || 'N/A'} (${cls.instructor || 'N/A'})`);
                    });
                } else {
                    console.log(`   ⚠️ Classes array is empty or missing!`);
                }
                console.log("");
            } else {
                console.log(`❌ No schedule found for ${branchId} (${docId})`);
                console.log("   This means getCurrentClass will return null.\n");
            }
        } catch (e) {
            console.error(`   Error fetching ${docId}:`, e.message);
        }
    }

    // Check recent attendance records
    console.log("\n=== RECENT ATTENDANCE RECORDS ===\n");
    try {
        const attendanceSnap = await db.collection('attendance')
            .where('timestamp', '>=', `${today}T00:00:00`)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (attendanceSnap.empty) {
            console.log("No attendance records for today.");
        } else {
            attendanceSnap.forEach((doc, i) => {
                const data = doc.data();
                console.log(`[${i + 1}] ${data.memberName || 'N/A'} | ${data.timestamp || 'N/A'}`);
                console.log(`    Class: ${data.className || 'N/A'} | Instructor: ${data.instructor || 'N/A'}`);
                console.log(`    Multi-session: ${data.isMultiSession ? 'YES (Session ' + data.sessionCount + ')' : 'No'}`);
                console.log("");
            });
        }
    } catch (e) {
        console.error("Error fetching attendance:", e.message);
    }
}

diagnoseDailyClasses().catch(console.error);

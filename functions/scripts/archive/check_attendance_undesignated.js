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

async function checkAttendanceUndesignated() {
    console.log("=== CHECKING ATTENDANCE FOR UNDESIGNATED INSTRUCTORS ===");
    
    // Check all attendance records
    // Caution: If the collection is huge, this might take time. 
    // Usually yoga app attendance is manageable (a few thousands).
    try {
        const snapshot = await db.collection('attendance').get();
        console.log(`Total attendance records found: ${snapshot.size}`);

        let foundCount = 0;
        const undesignatedRecords = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const instructor = data.instructor;
            const isUndesignated = !instructor || instructor === '미지정' || instructor.trim() === '';
            
            if (isUndesignated) {
                foundCount++;
                // Save first 10 for sample reporting
                if (undesignatedRecords.length < 10) {
                    undesignatedRecords.push({
                        id: doc.id,
                        date: data.date,
                        memberName: data.memberName,
                        className: data.className,
                        instructor: instructor
                    });
                }
            }
        });

        if (foundCount === 0) {
            console.log("\n✅ No attendance records with undesignated instructor found.");
        } else {
            console.log(`\n⚠️ Found ${foundCount} attendance records with undesignated instructor.`);
            console.log("\nSample records (up to 10):");
            undesignatedRecords.forEach((r, i) => {
                console.log(`[${i+1}] ${r.date} | ${r.memberName} | ${r.className} | Instructor: '${r.instructor}'`);
            });
        }
    } catch (e) {
        console.error("Error fetching attendance:", e.message);
    }
}

checkAttendanceUndesignated().catch(console.error);

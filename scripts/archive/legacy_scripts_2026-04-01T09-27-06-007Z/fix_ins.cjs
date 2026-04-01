const admin = require('firebase-admin');
const sa = require('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        console.log("Starting script...");
        const batch = db.batch();
        const snap = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
            .where('method', '==', 'system_restore')
            .get();

        let count = 0;
        snap.forEach(doc => {
            const data = doc.data();
            let newInstructor = data.instructor;
            
            if (data.className.includes('18:40') || data.className.includes('19:50')) {
                newInstructor = '현아';
            } else if (data.className.includes('21:00') || data.className.includes('플라잉')) {
                newInstructor = '솜이';
            }
            
            if (newInstructor !== data.instructor) {
                batch.update(doc.ref, { instructor: newInstructor });
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            console.log(`Updated instructors for ${count} restored records.`);
        } else {
            console.log('No instructors needed updating.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

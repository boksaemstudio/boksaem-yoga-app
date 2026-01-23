import admin from 'firebase-admin';

try {
    admin.initializeApp({
        projectId: 'boksaem-yoga'
    });
} catch (e) { console.warn(e); }

const db = admin.firestore();

async function check8745() {
    console.log("=== Checking Member 8745 ===");
    try {
        const snap = await db.collection('members').where('phoneLast4', '==', '8745').get();
        if (snap.empty) {
            console.log("No member found with PIN 8745 in Firestore.");
        } else {
            snap.forEach(doc => {
                const d = doc.data();
                console.log(`Found: ${d.name} (ID: ${doc.id})`);
                console.log(`Credits: ${d.credits}, EndDate: ${d.endDate}, Branch: ${d.homeBranch}`);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

check8745();

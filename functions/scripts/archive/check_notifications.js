const admin = require('firebase-admin');

async function inspect() {
    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: 'boksaem-yoga'
            });
        }

        const db = admin.firestore();

        console.log('--- FCM TOKENS ---');
        const tokensSnap = await db.collection('fcm_tokens').get();
        if (tokensSnap.empty) {
            console.log('No tokens found in fcm_tokens collection.');
        }
        tokensSnap.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id.substring(0, 10)}... | Role: ${data.role} | Instructor: ${data.instructorName} | MemberId: ${data.memberId} | Updated: ${data.updatedAt}`);
        });

        console.log('\n--- INSTRUCTORS ---');
        const instSnap = await db.collection('instructors').get();
        instSnap.forEach(doc => {
            console.log(`ID: ${doc.id} | Data:`, doc.data());
        });

        console.log('\n--- BRANCHES (Config) ---');
        const branchSnap = await db.collection('branches').get();
        branchSnap.forEach(doc => {
            console.log(`ID: ${doc.id} | Data:`, doc.data());
        });
    } catch (e) {
        console.error('Inspection failed:', e);
    }
}

inspect().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

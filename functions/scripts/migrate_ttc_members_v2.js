const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateTtcMembersV2() {
    console.log('Starting TTC Member Migration V2 (DB Name Scan)...');

    try {
        const membersSnap = await db.collection('members').get();
        console.log(`Scanning ${membersSnap.size} members...`);

        let updatedCount = 0;
        const batchSize = 100;
        let batch = db.batch();
        let batchOperationCount = 0;
        const ttcMembers = [];

        membersSnap.docs.forEach(doc => {
            const m = doc.data();
            if (m.name && m.name.toLowerCase().includes('ttc')) {
                ttcMembers.push({ doc, data: m });
            }
        });

        console.log(`Found ${ttcMembers.length} TTC members by name.`);

        for (const { doc, data } of ttcMembers) {
            if (data.credits !== 99999) {
                batch.update(doc.ref, { 
                    credits: 99999,
                    updatedAt: new Date().toISOString(),
                    migrationNote: `TTC Migration V2: Name matched 'ttc'`
                });
                
                console.log(`[UPDATE] ${data.name} (${doc.id}) -> Unlimited.`);
                
                batchOperationCount++;
                updatedCount++;
            } else {
                console.log(`[SKIP] ${data.name} (${doc.id}) -> Already 99999.`);
            }

             if (batchOperationCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                batchOperationCount = 0;
            }
        }

        if (batchOperationCount > 0) {
            await batch.commit();
        }

        console.log(`Migration Complete. Updated ${updatedCount} members.`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrateTtcMembersV2();

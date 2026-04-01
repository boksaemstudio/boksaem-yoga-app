const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    try {
        console.log('🔄 Checking demo daily_classes grouping...');
        const classesSnap = await db.collection('studios/demo-yoga/daily_classes').get();
        console.log(`Found ${classesSnap.size} daily_classes documents.`);

        const grouped = {};

        // 1. Group existing classes
        for (const doc of classesSnap.docs) {
            const data = doc.data();
            
            // IF it already has 'classes' array, it's correct format. Skip grouping.
            if (data.classes && Array.isArray(data.classes)) {
                continue;
            }

            const branchId = data.branchId || 'main'; // Default to main if missing
            const date = data.date;
            if (!date) continue;

            const key = `${branchId}_${date}`;
            if (!grouped[key]) {
                grouped[key] = { branchId, date, classes: [] };
            }

            // Push this as a single class entry
            grouped[key].classes.push({
                time: data.time || data.classTime || '00:00',
                title: data.className || data.title || data.name || '미정',
                instructor: data.instructor || '미정',
                status: data.status || 'normal',
                capacity: data.capacity || 20,
                attendees: data.attendees || []
            });
        }

        const groupKeys = Object.keys(grouped);
        if (groupKeys.length === 0) {
            console.log('✅ No un-grouped classes found.');
            process.exit(0);
        }

        console.log(`📦 Grouping into ${groupKeys.length} daily class documents...`);

        // Use batch to delete old ones and set new ones
        let batch = db.batch();
        let opsCount = 0;

        // Delete bad format
        for (const doc of classesSnap.docs) {
            if (!doc.data().classes) {
                batch.delete(doc.ref);
                opsCount++;
                if (opsCount >= 400) {
                    await batch.commit();
                    batch = db.batch();
                    opsCount = 0;
                }
            }
        }

        // Insert new format
        for (const key of groupKeys) {
            const docRef = db.collection('studios/demo-yoga/daily_classes').doc(key);
            batch.set(docRef, grouped[key]);
            
            // Generate monthly schedule to ensure it shows 'saved'
            const [bId, dateStr] = key.split('_');
            const [y, m, d] = dateStr.split('-');
            const metaDocId = `${bId}_${parseInt(y)}_${parseInt(m)}`;
            const metaDocRef = db.collection('studios/demo-yoga/monthly_schedules').doc(metaDocId);
            batch.set(metaDocRef, { branchId: bId, year: parseInt(y), month: parseInt(m), isSaved: true }, { merge: true });

            opsCount += 2;
            if (opsCount >= 400) {
                await batch.commit();
                batch = db.batch();
                opsCount = 0;
            }
        }

        if (opsCount > 0) {
            await batch.commit();
        }

        console.log('✅ monthly/daily schedule successfully grouped and fixed.');
    } catch (e) {
        console.error('❌ Error in hotfix:', e);
    }
    process.exit(0);
}

run();

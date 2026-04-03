const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

console.log('Initializing Firebase Admin...');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    try {
        console.log('Starting DB Patch for demo-yoga daily_classes...');
        const classesRef = db.collection('studios/demo-yoga/daily_classes');
        const snapshot = await classesRef.get();
        console.log(`Found ${snapshot.size} daily_class documents.`);

        const batch = db.batch();
        let changedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let hasChanges = false;
            
            if (data.classes && Array.isArray(data.classes)) {
                const updatedClasses = data.classes.map(cls => {
                    if (cls.instructor === '엄마 원장 선생님') {
                        hasChanges = true;
                        return { ...cls, instructor: '엠마 원장 선생님' };
                    }
                    return cls;
                });

                if (hasChanges) {
                    batch.update(doc.ref, { classes: updatedClasses });
                    changedCount++;
                }
            }
        });

        if (changedCount > 0) {
            console.log(`Updating ${changedCount} documents...`);
            await batch.commit();
            console.log('Patch committed successfully.');
        } else {
            console.log('No documents needed patching. Everything is already updated!');
        }

        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error('Script failed:', e);
        process.exit(1);
    }
}

run();

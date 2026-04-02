const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();

async function run() {
    try {
        const studioDoc = await db.doc('studios/demo-yoga').get();
        console.log('STUDIO CONFIG:', JSON.stringify(studioDoc.data().BRANCHES, null, 2));

        const classesQuery = await db.collection('studios/demo-yoga/daily_classes')
            .where('branchId', '==', 'main')
            .limit(5)
            .get();
            
        console.log('DAILY CLASSES COUNT:', classesQuery.size);
        classesQuery.forEach(doc => {
            console.log(doc.id, '->', JSON.stringify(doc.data().classes[0]));
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

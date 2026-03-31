const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('Cleaning up platform/registry/studios...');
    const sn = await db.collection('platform/registry/studios').get();
    
    for (const doc of sn.docs) {
        const data = doc.data();
        const str = JSON.stringify(data).toLowerCase();
        const id = doc.id;
        
        console.log(`Found registry item: ${id} -> ${data.name}`);
        
        // delete if it matches garbage data seen
        if (id.includes('yyyu') || id.includes('wqq') || id === 'egeq' || str.includes('wqqqq') || str.includes('7766') || str.includes('7788')) {
            console.log(`❌ Deleting ${id} from platform registry!`);
            await doc.ref.delete();
            
            // Also nuke from studios
            const cols = ['members', 'sales', 'attendances', 'schedules', 'notices', 'branches', 'tickets', 'classes', 'prices', 'admins'];
            for(const c of cols) {
                const subSn = await db.collection('studios/' + id + '/' + c).get();
                for (const subDoc of subSn.docs) await subDoc.ref.delete();
            }
            await db.collection('studios').doc(id).delete();
            await db.collection('studio_registry').doc(id).delete();
        }
    }
    console.log('Done.');
}

run().catch(console.error);

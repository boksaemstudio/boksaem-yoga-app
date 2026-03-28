const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found:', serviceAccountPath);
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function purgeOldBranches() {
    const tenants = ['demo-yoga', 'ssangmun-yoga'];
    
    for (const tenantId of tenants) {
        console.log(`\n🧹 Purging old branch data for: ${tenantId}`);
        const tenantDoc = db.collection('studios').doc(tenantId);
        
        // 1. Force overwrite branches to only 본점
        await tenantDoc.update({
            branches: [{ id: 'main', name: '본점' }]
        });
        console.log('✅ branches forced to 본점 only');
        
        // 2. Delete Firestore FieldValue for old schedule image keys
        const doc = await tenantDoc.get();
        const data = doc.data();
        if (data?.scheduleImages) {
            const keysToDelete = {};
            for (const key of Object.keys(data.scheduleImages)) {
                if (key.includes('gangnam') || key.includes('hongdae') || key.includes('강남') || key.includes('홍대')) {
                    keysToDelete[`scheduleImages.${key}`] = admin.firestore.FieldValue.delete();
                    console.log(`  🗑️ Deleting scheduleImages key: ${key}`);
                }
            }
            if (Object.keys(keysToDelete).length > 0) {
                await tenantDoc.update(keysToDelete);
            }
        }
        
        // 3. Delete old branch-specific schedule collections
        const schedulePaths = [
            `studios/${tenantId}/schedules/gangnam`,
            `studios/${tenantId}/schedules/hongdae`
        ];
        for (const path of schedulePaths) {
            const docRef = db.doc(path);
            const sDoc = await docRef.get();
            if (sDoc.exists) {
                // Delete all subcollections
                const subcols = await docRef.listCollections();
                for (const subcol of subcols) {
                    const snap = await subcol.limit(500).get();
                    const batch = db.batch();
                    snap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                    console.log(`  🗑️ Deleted ${snap.size} docs from ${subcol.path}`);
                }
                await docRef.delete();
                console.log(`  🗑️ Deleted schedule doc: ${path}`);
            }
        }
        
        // 4. Verify final state
        const verifyDoc = await tenantDoc.get();
        const verifyData = verifyDoc.data();
        console.log(`✅ Final branches: ${JSON.stringify(verifyData?.branches)}`);
        console.log(`✅ Final scheduleImages keys: ${Object.keys(verifyData?.scheduleImages || {}).join(', ')}`);
    }
    
    console.log('\n🎉 All old branch data purged successfully!');
}

purgeOldBranches().catch(console.error).finally(() => process.exit(0));

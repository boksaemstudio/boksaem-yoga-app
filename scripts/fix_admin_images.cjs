const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixImagesForTenant(tenantId) {
    console.log(`Fixing images for ${tenantId}...`);
    const imagesRef = db.collection('studios').doc(tenantId).collection('images');
    
    // The UI (AdminDashboard.jsx) looks for: images.price_table_1 and images.price_table_2
    await imagesRef.doc('price_table_1').set({ url: 'https://passflow-0324.web.app/assets/demo_pricing.png' }, { merge: true });
    await imagesRef.doc('price_table_2').set({ url: 'https://passflow-0324.web.app/assets/demo_pricing.png' }, { merge: true });
    
    // Also set schedule images just in case
    await imagesRef.doc('timetable_1').set({ url: 'https://passflow-0324.web.app/assets/demo_schedule.png' }, { merge: true });
    await imagesRef.doc('timetable_2').set({ url: 'https://passflow-0324.web.app/assets/demo_schedule.png' }, { merge: true });
    
    console.log(`Successfully updated images for ${tenantId}`);
}

async function run() {
    await fixImagesForTenant('demo-yoga');
    await fixImagesForTenant('ssangmun-yoga');
    process.exit(0);
}

run().catch(console.error);

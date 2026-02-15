const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize with service account
const serviceAccountPath = path.join(__dirname, 'functions/service-account-key.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} else {
    if (admin.apps.length === 0) admin.initializeApp();
}

const db = admin.firestore();

async function checkSales() {
    console.log('--- Checking Sales Data for Feb 2026 ---');
    const start = '2026-02-01';
    const end = '2026-02-28';

    // Note: Sales collection might use 'date' string YYYY-MM-DD or ISO
    const snapshot = await db.collection('sales').get();
    
    const sales = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        // Filter loosely for Feb 2026 in memory
        if (d.date && (d.date.startsWith('2026-02') || (d.date >= '2026-02-01' && d.date <= '2026-02-28'))) {
            sales.push({ id: doc.id, ...d });
        }
    });

    console.log(`Total Sales Records in Feb: ${sales.length}`);

    // Check for duplicates
    const seen = new Set();
    sales.forEach(s => {
        const key = `${s.memberName}_${s.amount}_${s.date.substring(0, 10)}`;
        if (seen.has(key)) {
            console.log(`⚠️ POTENTIAL DUPLICATE: ${s.memberName} - ${s.amount} - ${s.date} (ID: ${s.id})`);
        } else {
            seen.add(key);
            console.log(` - ${s.date} | ${s.memberName} | ${s.amount.toLocaleString()} | ${s.item} | Type: ${s.type}`);
        }
    });
}

checkSales().catch(console.error);

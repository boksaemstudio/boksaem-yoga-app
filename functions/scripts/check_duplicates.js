const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

try {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    admin.initializeApp();
}

const db = getFirestore();

async function findDuplicatePhones() {
    console.log('Fetching all members to check for duplicates...');
    const snapshot = await db.collection('members').get();

    const phoneMap = {};
    const duplicates = [];

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const phone = data.phone || '';
        // Extract last 4 digits
        const last4 = phone.replace(/[^0-9]/g, '').slice(-4);

        if (last4.length === 4) {
            if (!phoneMap[last4]) {
                phoneMap[last4] = [];
            }
            phoneMap[last4].push({
                id: doc.id,
                name: data.name,
                fullPhone: phone
            });
        }
    });

    // Filter for duplicates
    for (const [last4, members] of Object.entries(phoneMap)) {
        if (members.length > 1) {
            duplicates.push({ last4, members });
        }
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} sets of duplicates:`);
        duplicates.slice(0, 5).forEach(d => {
            console.log(`Last 4: ${d.last4}`);
            d.members.forEach(m => console.log(` - ${m.name} (${m.fullPhone})`));
        });
        if (duplicates.length > 5) console.log(`...and ${duplicates.length - 5} more sets.`);
    } else {
        console.log('No existing duplicates found (based on last 4 digits).');
    }
}

findDuplicatePhones();

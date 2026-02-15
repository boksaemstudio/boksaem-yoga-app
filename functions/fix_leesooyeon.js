
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixMember() {
    console.log('🔍 Searching for member "이수연" to fix...');
    
    // 1. Find Member
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('name', '==', '이수연').get();

    if (snapshot.empty) {
        console.log('❌ Member "이수연" not found.');
        return;
    }

    let targetDoc = null;
    snapshot.forEach((doc) => {
        // If multiple, look for the one with phone ending 1748
        const data = doc.data();
        if (data.phone && data.phone.endsWith('1748')) {
            targetDoc = doc;
        } else if (!targetDoc) {
            targetDoc = doc; // Fallback to first one
        }
    });

    if (!targetDoc) {
        console.log('❌ Member found but could not identify specific target.');
        return;
    }

    const memberId = targetDoc.id;
    const currentData = targetDoc.data();

    console.log(`✅ Found Target Member: ${currentData.name} (${memberId})`);
    console.log('   Current Data:', JSON.stringify(currentData, null, 2));

    // 2. Prepare Updates
    const updates = {};
    if (!currentData.status) {
        console.log('   👉 Status is missing. Setting to "active".');
        updates.status = 'active';
    }
    
    // Check other fields
    if (!currentData.startDate) {
        console.log('   👉 StartDate is missing. Setting to today (temporary fix).');
        updates.startDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    }

    if (Object.keys(updates).length === 0) {
        console.log('✅ No updates needed. Member data looks fine (except maybe hidden issues).');
    } else {
        await membersRef.doc(memberId).update(updates);
        console.log('✅ Successfully updated member fields:', updates);
    }

    // 3. Verify
    const updatedSnap = await membersRef.doc(memberId).get();
    console.log('   Updated Data:', JSON.stringify(updatedSnap.data(), null, 2));

}

fixMember().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

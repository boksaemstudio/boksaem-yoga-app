const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixMember() {
    const mems = await db.collection('members').where('name', '==', '변은정').get();
    for (const doc of mems.docs) {
        console.log("Fixing MEMBER ID:", doc.id);
        
        // 1. Delete upcomingMembership
        await db.collection('members').doc(doc.id).update({
            upcomingMembership: admin.firestore.FieldValue.delete()
        });
        console.log("Deleted upcomingMembership from member profile.");

        // 2. Find and delete the duplicate sales record
        const sales = await db.collection('sales').where('memberId', '==', doc.id).get();
        let deleted = false;
        sales.forEach(async (s) => {
            const data = s.data();
            // Delete the one that had startDate: "TBD"
            if (data.startDate === 'TBD') {
                await db.collection('sales').doc(s.id).delete();
                console.log("Deleted duplicate sales record:", s.id);
                deleted = true;
            }
        });
    }
}

fixMember().then(() => {
    setTimeout(() => process.exit(0), 1500);
});

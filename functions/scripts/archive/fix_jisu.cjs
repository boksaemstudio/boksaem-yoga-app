const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixJiSu() {
    const mems = await db.collection('members').where('name', '==', '김지수').get();
    for (const doc of mems.docs) {
        const data = doc.data();
        if (data.upcomingMembership && data.phone.includes("1875")) {
            console.log("Fixing MEMBER ID:", doc.id);
            
            // Promote upcomingMembership
            await db.collection('members').doc(doc.id).update({
                membershipType: data.upcomingMembership.membershipType,
                credits: data.upcomingMembership.credits,
                startDate: "2026-02-27",
                endDate: "2026-05-26",
                upcomingMembership: admin.firestore.FieldValue.delete()
            });
            console.log("Promoted upcomingMembership to Active.");
        }
    }
}

fixJiSu().then(() => {
    setTimeout(() => process.exit(0), 1000);
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixMemberToken() {
    const token = "f1svGzy8YFvV0tGZVlqngL:APA91bFxgAvVS3vahGy13cuC2XmM3WmWhh0Od10guPJbdopeYgf1sc2ih43p-2FUjX-VsWgVrsqjcQief-7gPDdlCrZ499SCwM52cT-z9wofjsrg7m_5Vuw";
    const memberId = "tFIoZWuWO6t1urD5ar12"; // 7073

    console.log(`Updating member ${memberId} with token...`);
    await db.collection('members').doc(memberId).update({
        fcmToken: token,
        pushEnabled: true,
        lastTokenUpdate: new Date()
    });
    console.log("Success!");
}

fixMemberToken();

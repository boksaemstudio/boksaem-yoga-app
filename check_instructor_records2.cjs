const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    let out = '--- Recent Attendance Records (Instructor names) ---\n';
    try {
        const attSnap = await db.collection('attendance').orderBy('timestamp', 'desc').limit(20).get();
        attSnap.forEach(d => {
            const att = d.data();
            out += `Class: ${att.className} | Instructor: ${att.instructor} | Member: ${att.memberName}\n`;
        });

        out += '\n--- Checking member settings again ---\n';
        const membersRef = db.collection('members');
        const wonjangQuery = await membersRef.where('name', '==', '원장').get();
        const hanaQuery = await membersRef.where('name', '==', '한아').get();

        wonjangQuery.forEach(d => out += `원장 member doc: ${d.id} | role: ${d.data().role} | pushEnabled: ${d.data().pushEnabled}\n`);
        hanaQuery.forEach(d => out += `한아 member doc: ${d.id} | role: ${d.data().role} | pushEnabled: ${d.data().pushEnabled}\n`);

        const allTokens = await db.collection('fcm_tokens').get();
        out += '\n--- All FCM Tokens Details ---\n';
        allTokens.forEach(d => {
            const dData = d.data();
            out += `Token: length=${dData.token?.length} | role=${dData.role} | instructorName=${dData.instructorName} | adminId=${dData.adminId} | memberId=${dData.memberId}\n`;
        });
        
        fs.writeFileSync('push_details.txt', out);
    } catch (e) {
        fs.writeFileSync('push_details.txt', 'Error: ' + e.message);
    }
    process.exit(0);
}

run();

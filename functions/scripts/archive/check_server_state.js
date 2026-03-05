const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

async function run() {
    try {
        // Check meditation usage
        const aiLogsRaw = await db.collection('ai_conversations').get();
        const users = new Set();
        aiLogsRaw.docs.forEach(doc => {
            if (doc.data().memberId) users.add(doc.data().memberId);
        });

        // Resolve member info
        const membersRaw = await db.collection('members').get();
        const memberMap = {};
        membersRaw.docs.forEach(doc => {
            memberMap[doc.id] = doc.data().name;
            if (doc.data().name && doc.data().id) {
               memberMap[doc.data().id] = doc.data().name; 
            }
        });

        const meditationUsers = Array.from(users).map(id => memberMap[id] || id);
        console.log('\n--- Meditation Users ---');
        console.log(meditationUsers.join(', '));
        
        // Check server errors (get last 20)
        console.log('\n--- Recent Server Errors ---');
        const errorsRaw = await db.collection('error_logs')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
            
        errorsRaw.docs.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp}] ${data.type || 'Error'}: ${data.message || data.error}`);
            if (data.details) console.log(`  Details: ${JSON.stringify(data.details)}`);
        });

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();

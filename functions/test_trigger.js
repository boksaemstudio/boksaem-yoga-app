const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function createTestMessage() {
    const testMemberId = 'd5dOhmZNi8wTm7iCFPlB'; // Existing member ID from previous check
    const messageData = {
        memberId: testMemberId,
        content: "[Test] Trigger check at " + new Date().toISOString(),
        type: 'admin_individual',
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    console.log('Adding test message...');
    const docRef = await db.collection('messages').add(messageData);
    console.log('Added message ID:', docRef.id);
    
    console.log('Watching for status updates (wait 30s)...');
    
    // Watch for updates
    const unsubscribe = docRef.onSnapshot(doc => {
        const d = doc.data();
        console.log(`Current status for ${doc.id}: ${d.status}`);
        if (d.solapiStatus) console.log('  SolapiStatus:', JSON.stringify(d.solapiStatus));
        if (d.pushStatus) console.log('  PushStatus:', JSON.stringify(d.pushStatus));
        
        if (d.solapiStatus || d.pushStatus) {
            console.log('Trigger WORKED!');
            process.exit(0);
        }
    });

    setTimeout(() => {
        console.log('Timed out. Trigger likely failed to fire or update.');
        unsubscribe();
        process.exit(1);
    }, 30000);
}

createTestMessage().catch(console.error);

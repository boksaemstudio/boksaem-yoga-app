/**
 * Check and display error logs from Firestore
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkErrorLogs() {
    try {
        console.log('📋 Fetching AI error logs from Firestore (ai_error_logs)...\n');

        const snapshot = await db.collection('ai_error_logs')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            console.log('✅ No AI error logs found in ai_error_logs collection.\n');
        } else {
            console.log(`Found ${snapshot.size} AI error log(s):\n`);
            console.log('='.repeat(80));

            snapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                console.log(`\n[${index + 1}] ID: ${doc.id}`);
                console.log(`Context: ${data.context || 'Unknown'}`);
                console.log(`Error: ${data.error || 'No message'}`);
                console.log(`Timestamp: ${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'N/A'}`);
                console.log('-'.repeat(80));
            });
        }

        console.log('\n📋 Fetching general error logs from Firestore (error_logs)...\n');
        const generalSnapshot = await db.collection('error_logs')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (generalSnapshot.empty) {
            console.log('✅ No general error logs found.\n');
        } else {
             // ... existing general log printing logic if needed, or just summary
             console.log(`Found ${generalSnapshot.size} general error log(s). Run detailed check if needed.\n`);
        }

        return { count: snapshot.size + generalSnapshot.size };

    } catch (error) {
        console.error('❌ Error fetching logs:', error);
        throw error;
    }
}

async function clearErrorLogs() {
    try {
        console.log('🗑️  Clearing all error logs...\n');

        const snapshot = await db.collection('error_logs').get();

        if (snapshot.empty) {
            console.log('✅ No error logs to delete.\n');
            return 0;
        }

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });

        await batch.commit();

        console.log(`✅ Successfully deleted ${count} error log(s).\n`);
        return count;

    } catch (error) {
        console.error('❌ Error clearing logs:', error);
        throw error;
    }
}

// Main execution
(async () => {
    try {
        // Check logs first
        const result = await checkErrorLogs();

        // If there are logs, ask to delete
        if (result.count > 0) {
            console.log('💡 Run with --clear flag to delete all error logs.\n');

            if (process.argv.includes('--clear')) {
                await clearErrorLogs();
                console.log('✅ All error logs have been cleared!\n');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();

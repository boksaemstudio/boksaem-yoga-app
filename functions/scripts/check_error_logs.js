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
        console.log('📋 Fetching error logs from Firestore...\n');

        const snapshot = await db.collection('error_logs')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log('✅ No error logs found! System is healthy.\n');
            return { count: 0, errors: [] };
        }

        console.log(`Found ${snapshot.size} error log(s):\n`);
        console.log('='.repeat(80));

        const errors = [];
        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            errors.push({ id: doc.id, ...data });

            console.log(`\n[${index + 1}] ID: ${doc.id}`);
            console.log(`Type: ${data.errorType || 'Unknown'}`);
            console.log(`Message: ${data.message || 'No message'}`);
            console.log(`Timestamp: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}`);
            console.log(`User: ${data.userId || 'Anonymous'}`);

            if (data.stack) {
                console.log(`Stack (first 200 chars): ${data.stack.substring(0, 200)}...`);
            }
            console.log('-'.repeat(80));
        });

        console.log(`\n📊 Total: ${snapshot.size} error log(s)\n`);

        return { count: snapshot.size, errors };

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

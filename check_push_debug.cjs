const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    const collections = [
        'notices', 'members', 'attendance', 'sales', 'push_history',
        'notifications', 'messages', 'practice_events', 'daily_classes',
        'monthly_schedules', 'settings', 'images', 'weekly_templates',
        'fcm_tokens', 'error_logs', 'pending_attendance'
    ];

    console.log('=== Firestore Collection Status ===');
    for (const name of collections) {
        try {
            const snap = await db.collection(name).limit(5).get();
            if (snap.empty) {
                console.log(`  ❌ ${name}: EMPTY`);
            } else {
                // Get approximate count
                const countSnap = await db.collection(name).count().get();
                const count = countSnap.data().count;
                console.log(`  ✅ ${name}: ${count} docs`);
            }
        } catch (e) {
            console.log(`  ⚠️ ${name}: ERROR - ${e.message.substring(0, 60)}`);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });

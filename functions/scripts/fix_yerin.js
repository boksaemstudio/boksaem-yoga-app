const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const snap = await db.collection('attendance')
        .where('date', '==', '2026-02-15')
        .where('branchId', '==', 'gwangheungchang')
        .get();
    
    for (const d of snap.docs) {
        const a = d.data();
        if (a.memberName && a.memberName.includes('예린')) {
            console.log('Found:', a.memberName, '|', a.className, '|', a.instructor);
            await d.ref.update({ className: '마이솔', instructor: '원장' });
            console.log('✅ Fixed: 마이솔 (원장)');
        }
    }
    process.exit(0);
})();

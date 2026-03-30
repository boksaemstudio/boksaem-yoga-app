const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}

const db = admin.firestore();
const tenantDb = db.doc('studios/demo-yoga');

async function fixDemo() {
    console.log('Fixing demo data...');

    console.log('Fixing settings/branch...');
    await tenantDb.collection('settings').doc('branch').set({
        branches: [
            { id: 'main', name: '본점', color: 'var(--primary-theme-color)' }
        ]
    }, { merge: true });

    await tenantDb.set({ active: true }, { merge: true });

    console.log('Loading members mapping...');
    const membersSnap = await tenantDb.collection('members').get();
    const memberMap = {};
    membersSnap.forEach(doc => {
        memberMap[doc.id] = doc.data();
    });

    console.log('Fixing attendance records...');
    const attendanceSnap = await tenantDb.collection('attendance').get();
    let batch = db.batch();
    let count = 0;

    for (const doc of attendanceSnap.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updates = {};

        if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp.toDate) {
            updates.timestamp = data.timestamp.toDate().toISOString();
            needsUpdate = true;
        } else if (data.timestamp && data.timestamp._seconds) {
            updates.timestamp = new Date(data.timestamp._seconds * 1000).toISOString();
            needsUpdate = true;
        }

        if (!data.memberName || data.memberName === '알 수 없음') {
            const m = memberMap[data.memberId];
            if (m) {
                updates.memberName = m.name;
                updates.memberPhone = m.phone;
                updates.profileImageUrl = m.profileImageUrl || null;
                needsUpdate = true;
            } else {
                updates.memberName = '데모 회원';
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            batch.update(doc.ref, updates);
            count++;
            if (count >= 400) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
    }
    console.log(`Updated ${attendanceSnap.size} attendance records.`);

    console.log('Demo fix complete!');
}

fixDemo()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

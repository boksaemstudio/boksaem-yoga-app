const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const T = 'studios/boksaem-yoga';

async function fix() {
    const m = db.collection(`${T}/members`);

    // 김혜인: 7 → 6
    const h = await m.where('name', '==', '김혜인').get();
    for (const d of h.docs) {
        await d.ref.update({ credits: 6 });
        console.log('김혜인: credits → 6 ✅');
    }

    // 이꽃메: upcoming 활성화 + credits=9
    const k = await m.where('name', '==', '이꽃메').get();
    for (const d of k.docs) {
        const x = d.data();
        const up = x.upcomingMembership;
        const update = { credits: 9 };
        if (up) {
            update.membershipType = up.membershipType || x.membershipType;
            update.startDate = up.startDate === 'TBD' ? '2026-03-14' : up.startDate;
            update.endDate = up.endDate === 'TBD' ? '2026-06-13' : up.endDate;
            update.upcomingMembership = admin.firestore.FieldValue.delete();
        }
        await d.ref.update(update);
        console.log(`이꽃메: credits → 9, endDate → ${update.endDate} ✅`);
    }
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

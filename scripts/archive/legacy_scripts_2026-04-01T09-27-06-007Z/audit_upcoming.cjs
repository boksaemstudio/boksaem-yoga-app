const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const TENANT_PATH = 'studios/boksaem-yoga';

async function audit() {
    console.log('=== credits=0 + upcomingMembership 존재 회원 확인 ===\n');

    const snap = await db.collection(`${TENANT_PATH}/members`).get();
    const issues = [];

    snap.forEach(doc => {
        const d = doc.data();
        if (d.upcomingMembership && (d.credits || 0) <= 0) {
            issues.push({
                name: d.name,
                credits: d.credits,
                endDate: d.endDate,
                upcoming: {
                    credits: d.upcomingMembership.credits,
                    startDate: d.upcomingMembership.startDate,
                    endDate: d.upcomingMembership.endDate,
                    membershipType: d.upcomingMembership.membershipType
                }
            });
        }
    });

    console.log(`발견: ${issues.length}명\n`);
    issues.forEach(m => {
        console.log(`  ${m.name}: credits=${m.credits}, endDate=${m.endDate}`);
        console.log(`    → upcoming: credits=${m.upcoming.credits}, ${m.upcoming.startDate}~${m.upcoming.endDate}`);
    });
}

audit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

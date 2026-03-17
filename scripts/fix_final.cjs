const admin = require('firebase-admin');
const path = require('path');

const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TENANT_PATH = 'studios/boksaem-yoga';
const DRY_RUN = process.argv.includes('--dry-run');

async function fix() {
    console.log(`=== 최종 membershipType 복원 (${DRY_RUN ? 'DRY RUN' : '⚡ LIVE'}) ===\n`);

    const membersRef = db.collection(`${TENANT_PATH}/members`);
    const snap = await membersRef.get();

    const fixes = [];

    snap.forEach(doc => {
        const data = doc.data();
        const name = data.name || '';
        const currentType = data.membershipType;

        // 1. ttc → general 롤백: 윤지혜ttc9기
        if (name === '윤지혜ttc9기' && currentType === 'general') {
            fixes.push({ id: doc.id, name, from: currentType, to: 'ttc', reason: 'ttc9기 회원인데 general로 변경됨' });
        }
    });

    console.log(`수정 대상: ${fixes.length}건\n`);

    for (const fix of fixes) {
        console.log(`  ${fix.name}: ${fix.from} → ${fix.to} (${fix.reason})`);
        if (!DRY_RUN) {
            await membersRef.doc(fix.id).update({ membershipType: fix.to });
            console.log(`    ✅ 수정 완료`);
        }
    }

    if (DRY_RUN && fixes.length > 0) {
        console.log('\n--dry-run 없이 실행하면 실제 수정됩니다.');
    }

    console.log('\n완료.');
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

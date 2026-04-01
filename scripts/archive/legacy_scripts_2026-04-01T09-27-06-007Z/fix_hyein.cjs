const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const TENANT_PATH = 'studios/boksaem-yoga';

async function fix() {
    const snap = await db.collection(`${TENANT_PATH}/members`).where('name', '==', '김혜인').get();

    if (snap.empty) { console.log('김혜인 not found'); return; }

    snap.forEach(async doc => {
        const data = doc.data();
        console.log('현재 상태:', JSON.stringify({
            credits: data.credits,
            endDate: data.endDate,
            membershipType: data.membershipType,
            upcomingMembership: data.upcomingMembership
        }, null, 2));

        // upcomingMembership이 있으면 활성화, 아니면 sales 기반 수정
        if (data.upcomingMembership) {
            const upcoming = data.upcomingMembership;
            console.log('\nupcomingMembership 활성화:');
            console.log(JSON.stringify(upcoming, null, 2));

            await doc.ref.update({
                credits: upcoming.credits,
                membershipType: upcoming.membershipType,
                startDate: upcoming.startDate === 'TBD' ? '2026-03-15' : upcoming.startDate,
                endDate: upcoming.endDate === 'TBD' ? '2026-04-14' : upcoming.endDate,
                upcomingMembership: admin.firestore.FieldValue.delete()
            });
            console.log('✅ upcomingMembership → 활성화 완료');
        } else {
            // sales 기록 기반 수정
            console.log('\nupcomingMembership 없음. 직접 수정:');
            await doc.ref.update({
                credits: 8,
                startDate: '2026-03-15',
                endDate: '2026-04-14'
            });
            console.log('✅ credits=8, endDate=2026-04-14 설정 완료');
        }

        // 수정 후 확인
        const updated = (await doc.ref.get()).data();
        console.log('\n수정 후:', JSON.stringify({
            credits: updated.credits,
            endDate: updated.endDate,
            membershipType: updated.membershipType,
            upcomingMembership: updated.upcomingMembership || '(없음)'
        }, null, 2));
    });
}

fix().then(() => setTimeout(() => process.exit(0), 2000)).catch(e => { console.error(e); process.exit(1); });

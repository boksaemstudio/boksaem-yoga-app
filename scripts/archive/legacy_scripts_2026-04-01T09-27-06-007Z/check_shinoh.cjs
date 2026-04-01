const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';

async function main() {
    // 1. Find 신오성 member
    const membersSnap = await db.collection(`studios/${STUDIO}/members`)
        .where('name', '==', '신오성').get();
    
    if (membersSnap.empty) {
        console.log('❌ 신오성 회원을 찾을 수 없습니다.');
        process.exit(0);
    }

    const member = membersSnap.docs[0];
    console.log(`✅ 회원: ${member.data().name} (ID: ${member.id})`);

    // 2. Check recent attendance records
    const attSnap = await db.collection(`studios/${STUDIO}/attendance`)
        .where('memberId', '==', member.id)
        .orderBy('date', 'desc')
        .limit(5)
        .get();

    console.log(`\n📋 최근 출석 기록 (${attSnap.size}건):`);
    attSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`   ${d.date} | className: ${d.className || 'N/A'} | instructor: "${d.instructor || 'MISSING'}" | status: ${d.status} | credits: ${d.credits}`);
    });

    // 3. Compare with other members' today attendance
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    console.log(`\n📋 오늘(${today}) 전체 출석 - instructor 필드 비교:`);
    const todaySnap = await db.collection(`studios/${STUDIO}/attendance`)
        .where('date', '==', today)
        .get();
    
    todaySnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`   ${d.memberName || 'N/A'} | instructor: "${d.instructor || 'MISSING'}" | className: ${d.className || 'N/A'}`);
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

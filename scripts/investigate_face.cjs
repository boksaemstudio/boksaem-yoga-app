const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    // 6:51 KST = 09:51 UTC
    console.log("=== 오후 6:45~7:00 KST 시간대 전체 출석 기록 ===");
    const snap = await db.collection('studios/boksaem-yoga/attendance')
        .where('date', '==', '2026-03-30')
        .get();
    
    const evening = [];
    snap.forEach(d => {
        const data = d.data();
        let tsDate;
        try { tsDate = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp); } catch(e) { return; }
        const utcH = tsDate.getUTCHours();
        const utcM = tsDate.getUTCMinutes();
        // KST 18:45~19:00 = UTC 09:45~10:00
        if (utcH === 9 && utcM >= 45 || utcH === 10 && utcM <= 5) {
            evening.push({
                id: d.id,
                name: data.memberName,
                memberId: data.memberId,
                time: tsDate.toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}),
                utc: tsDate.toISOString(),
                status: data.status,
                className: data.className,
                type: data.type,
                eventId: data.eventId
            });
        }
    });
    
    evening.sort((a,b) => new Date(a.utc) - new Date(b.utc));
    console.log(`Found ${evening.length} records between 6:45~7:00 PM:`);
    evening.forEach(r => console.log(`  ${r.time} | ${r.name} (${r.memberId}) | ${r.className} | ${r.status} | eventId: ${r.eventId}`));

    // Check 정계수 face data
    console.log("\n=== 정계수 얼굴 등록 정보 ===");
    const memberSnap = await db.collection('studios/boksaem-yoga/members').where('name', '==', '정계수').get();
    memberSnap.forEach(d => {
        const m = d.data();
        console.log(`ID: ${d.id} | hasFace: ${m.hasFaceDescriptor} | faceUpdated: ${m.faceUpdatedAt}`);
    });

    // Check 서인덕 face data
    console.log("\n=== 서인덕 얼굴 등록 정보 ===");
    const siSnap = await db.collection('studios/boksaem-yoga/members').where('name', '==', '서인덕').get();
    siSnap.forEach(d => {
        const m = d.data();
        console.log(`ID: ${d.id} | hasFace: ${m.hasFaceDescriptor} | faceUpdated: ${m.faceUpdatedAt}`);
    });

    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

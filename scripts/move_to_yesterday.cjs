const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fixToYesterday() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    // The exact 13 members we need to fix
    const targetMembers = [
        '허향무', '노효원ttc2기', '엄명희', '장민정', '류지원', 
        '문정훈ttc6기', '이수연', '정다솔', '박미진', '성예린ttc9기', 
        '차신애', '나혜실ttc6기', '백현경'
    ];
    
    const correctDateStr = '2026-04-14';
    // 2026-04-14 13:30:00 KST
    const correctTimestamp = '2026-04-14T04:30:00.000Z'; // UTC ISO string equivalent to 13:30 KST
    
    const batch = db.batch();
    let count = 0;
    
    // We have to batch by 10 for 'in' queries
    const chunks = [];
    for(let i=0; i<targetMembers.length; i+=10) {
        chunks.push(targetMembers.slice(i, i+10));
    }
    
    for (const chunk of chunks) {
        const snap = await tenantDb.collection('attendance')
            .where('memberName', 'in', chunk)
            .where('className', '==', '마이솔')
            .get();
            
        snap.forEach(d => {
            const data = d.data();
            // Since there COULD be other mysore records for these people on other days,
            // we should only fix the ones that we accidentally moved to April 15 
            // OR the ones that have "관리자 수동 등록" in their note.
            if (data.note && data.note.includes('수동 등록 (2026-04-14 광흥창 오후1:30 마이솔 희정선생님)')) {
                const updates = {
                    date: correctDateStr,
                    timestamp: correctTimestamp, // MUST be a string!
                    classTime: '13:30',
                    instructor: '희정',
                    branchId: 'gwangheungchang'
                };
                
                console.log(`Moving doc ${d.id} for ${data.memberName} back to 2026-04-14`);
                batch.update(d.ref, updates);
                count++;
            }
        });
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully moved ${count} documents back to yesterday.`);
    } else {
        console.log("No documents needed moving.");
    }
}

fixToYesterday().catch(console.error).finally(()=>process.exit(0));

const admin = require('firebase-admin');
const saPath = '../functions/service-account-key.json';
const sa = require(saPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}
const db = admin.firestore();

async function main() {
    console.log('--- 모든 스튜디오에서 소프트 삭제(deletedAt)된 회원 찾기 ---');
    
    // get all studios
    const studiosSnap = await db.collection('studios').get();
    
    let totalDeleted = 0;
    const deletedList = [];

    for (const studioDoc of studiosSnap.docs) {
        const studioId = studioDoc.id;
        
        const memSnap = await db.collection(`studios/${studioId}/members`).get();
        memSnap.forEach(m => {
            const data = m.data();
            if (data.deletedAt) {
                let dt = data.deletedAt;
                if (dt.toDate) dt = dt.toDate().toLocaleString();
                deletedList.push({
                    studio: studioId,
                    memberId: m.id,
                    name: data.name || '-',
                    phone: data.phone || '-',
                    deletedAt: dt
                });
                totalDeleted++;
            }
        });
    }

    console.log(`총 ${totalDeleted}명의 삭제된 회원을 찾았습니다.\n`);
    if (deletedList.length > 0) {
        console.table(deletedList);
    }
    
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

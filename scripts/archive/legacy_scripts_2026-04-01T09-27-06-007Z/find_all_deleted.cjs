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
    console.log('--- 소프트 삭제(deletedAt 필드 존재)된 회원 검색 시작 ---');
    
    const snapshot = await db.collection('studios/boksaem-yoga/members').get();
    
    const deletedMembers = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.deletedAt) {
            let deleteTime = data.deletedAt;
            if (deleteTime.toDate) {
                deleteTime = deleteTime.toDate().toLocaleString();
            }
            deletedMembers.push({
                memberId: doc.id,
                name: data.name || '-',
                phone: data.phone || '-',
                branch: data.branchId || data.branch || '-',
                deletedAt: deleteTime
            });
        }
    });

    console.log(`총 ${deletedMembers.length}명의 삭제된 회원을 찾았습니다.\n`);
    
    if (deletedMembers.length > 0) {
        console.table(deletedMembers);
    }
    
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

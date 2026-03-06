const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMember() {
    const snapshot = await db.collection('members')
        .where('name', '==', '전시현')
        .get();
    
    if (snapshot.empty) {
        console.log('No member found with name 전시현');
        return;
    }
    
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log('=== 전시현 회원 데이터 ===');
        console.log('ID:', doc.id);
        console.log('startDate:', data.startDate);
        console.log('endDate:', data.endDate);
        console.log('credits:', data.credits);
        console.log('membershipType:', data.membershipType);
        console.log('branchId:', data.branchId);
        console.log('upcomingMembership:', JSON.stringify(data.upcomingMembership, null, 2));
        
        // Check what badge logic would produce
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const todayStartMs = new Date(todayStr).getTime();
        console.log('\n=== Badge Logic Check ===');
        console.log('Today (KST):', todayStr);
        console.log('todayStartMs:', todayStartMs);
        
        if (data.upcomingMembership) {
            const upStartDate = data.upcomingMembership.startDate;
            console.log('upcomingMembership.startDate:', upStartDate);
            if (upStartDate && upStartDate !== 'TBD') {
                const upStartMs = new Date(upStartDate).getTime();
                console.log('upStartMs:', upStartMs);
                console.log('upStartMs <= todayStartMs?', upStartMs <= todayStartMs);
            }
        }
    });
    
    process.exit(0);
}

checkMember().catch(err => {
    console.error(err);
    process.exit(1);
});

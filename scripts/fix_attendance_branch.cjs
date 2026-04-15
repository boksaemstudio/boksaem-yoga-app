const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fix() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    // 잘못된 출석 레코드 찾기 (branchId='C' + className='마이솔')
    const wrongSnap = await tenantDb.collection('attendance')
        .where('branchId', '==', 'C')
        .where('className', '==', '마이솔')
        .get();
    
    console.log('잘못된 출석 레코드 (branch=C):', wrongSnap.size + '건');
    
    if (wrongSnap.empty) {
        console.log('수정할 레코드 없음');
        return;
    }

    const batch = db.batch();
    wrongSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  수정: ${data.memberName} | C → gwangheungchang, approved → valid`);
        batch.update(doc.ref, {
            branchId: 'gwangheungchang',
            status: 'valid'
        });
    });
    
    await batch.commit();
    console.log('\n✅ 모든 레코드 수정 완료! (branchId: gwangheungchang, status: valid)');
}

fix().catch(console.error).finally(() => process.exit(0));

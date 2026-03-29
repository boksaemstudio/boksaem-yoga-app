const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function fixNestedBiometrics() {
    console.log('=== face_biometrics 중첩 배열 점검 및 수정 ===\n');
    
    const bioRef = db.collection(`studios/${STUDIO_ID}/face_biometrics`);
    const snap = await bioRef.get();
    
    let fixedCount = 0;
    let totalCount = 0;
    
    for (const doc of snap.docs) {
        totalCount++;
        const data = doc.data();
        const memberId = data.memberId || doc.id;
        
        if (!data.descriptors || !Array.isArray(data.descriptors)) continue;
        
        let hasNestedArray = false;
        const fixedDescriptors = data.descriptors.map(d => {
            if (!Array.isArray(d)) return null;
            
            // 정상: [0.1, 0.2, ...] (flat number array)
            if (d.length > 0 && typeof d[0] === 'number') return d;
            
            // 비정상: [[0.1, 0.2, ...]] (nested array)
            if (d.length > 0 && Array.isArray(d[0])) {
                hasNestedArray = true;
                console.log(`  ⚠️ [${doc.id}] memberId=${memberId} — 중첩 배열 발견! depth=${getDepth(d)}`);
                return d.flat();
            }
            
            return null;
        }).filter(d => d !== null && d.length > 0);
        
        if (hasNestedArray) {
            console.log(`  🔧 수정 중... descriptors: ${data.descriptors.length} → ${fixedDescriptors.length}`);
            
            await bioRef.doc(doc.id).update({
                descriptors: fixedDescriptors,
                descriptor: fixedDescriptors[fixedDescriptors.length - 1] || data.descriptor,
                descriptorCount: fixedDescriptors.length,
                fixedAt: new Date().toISOString(),
                fixReason: 'nested_array_cleanup'
            });
            
            fixedCount++;
            console.log(`  ✅ [${doc.id}] 수정 완료\n`);
        }
    }
    
    console.log(`\n=== 결과 ===`);
    console.log(`전체 문서: ${totalCount}`);
    console.log(`수정된 문서: ${fixedCount}`);
    console.log(`정상 문서: ${totalCount - fixedCount}`);
}

function getDepth(arr) {
    if (!Array.isArray(arr)) return 0;
    return 1 + Math.max(0, ...arr.map(getDepth));
}

fixNestedBiometrics().then(() => process.exit(0)).catch(e => {
    console.error('❌ 실패:', e);
    process.exit(1);
});

const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});
const db = admin.firestore();
const STUDIO = 'boksaem-yoga';
const col = db.collection(`studios/${STUDIO}/fcm_tokens`);

async function cleanup() {
    console.log('=== 만료 토큰 정리 + members.fcmToken 갱신 ===\n');
    
    const allSnap = await col.get();
    const tokensByDevice = {};
    
    // 1. 기기별로 그룹핑 (prefix 기준)
    allSnap.forEach(doc => {
        const prefix = doc.id.split(':')[0];
        if (!tokensByDevice[prefix]) tokensByDevice[prefix] = [];
        tokensByDevice[prefix].push({ id: doc.id, data: doc.data() });
    });
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const [prefix, tokens] of Object.entries(tokensByDevice)) {
        if (tokens.length <= 1) {
            keptCount++;
            continue;
        }
        
        // 최신 토큰만 유지 (updatedAt 기준)
        tokens.sort((a, b) => (b.data.updatedAt || '').localeCompare(a.data.updatedAt || ''));
        const kept = tokens[0];
        const toDelete = tokens.slice(1);
        
        // 삭제 대상의 memberId/instructorName을 최신 토큰에 이관
        let needsUpdate = false;
        const updateData = {};
        for (const old of toDelete) {
            if (old.data.memberId && !kept.data.memberId) {
                updateData.memberId = old.data.memberId;
                needsUpdate = true;
            }
            if (old.data.instructorName && !kept.data.instructorName) {
                updateData.instructorName = old.data.instructorName;
                needsUpdate = true;
            }
        }
        
        if (needsUpdate) {
            await col.doc(kept.id).update(updateData);
            console.log(`  [MIGRATED] ${prefix.substring(0,20)}... → kept ${kept.id.substring(0,30)}... + migrated:`, Object.keys(updateData));
        }
        
        // stale 삭제
        for (const old of toDelete) {
            await col.doc(old.id).delete();
            deletedCount++;
        }
        
        keptCount++;
        console.log(`  [CLEANED] ${prefix.substring(0,20)}... — kept newest, deleted ${toDelete.length} stale`);
    }
    
    console.log(`\n✅ 정리 완료: ${deletedCount}개 삭제, ${keptCount}개 기기 유지`);
    
    // 2. 남은 토큰의 memberId로 members 문서 fcmToken 갱신
    console.log('\n=== members.fcmToken 갱신 ===');
    const remainingSnap = await col.get();
    const memberUpdates = {};
    remainingSnap.forEach(doc => {
        const d = doc.data();
        if (d.memberId && d.role === 'member') {
            memberUpdates[d.memberId] = doc.id; // doc.id = 실제 토큰
        }
    });
    
    for (const [mid, token] of Object.entries(memberUpdates)) {
        try {
            await db.doc(`studios/${STUDIO}/members/${mid}`).update({ fcmToken: token, pushEnabled: true });
            console.log(`  ✅ ${mid.substring(0,15)}... → ${token.substring(0,30)}...`);
        } catch (e) {
            console.log(`  ❌ ${mid.substring(0,15)}... — ${e.message}`);
        }
    }
    
    // 3. 송미호 특수 처리: admin 토큰에 memberId 추가
    const songMemberId = 'hP0V5MbrVIkz5fmD14cY';
    console.log('\n=== 송미호 admin 토큰에 memberId 추가 ===');
    const remaining2 = await col.get();
    remaining2.forEach(async doc => {
        const d = doc.data();
        if (doc.id.startsWith('fNj4gx') && d.role === 'admin' && !d.memberId) {
            await col.doc(doc.id).update({ memberId: songMemberId });
            // 또한 members.fcmToken도 이 토큰으로 갱신
            await db.doc(`studios/${STUDIO}/members/${songMemberId}`).update({ fcmToken: doc.id, pushEnabled: true });
            console.log(`  ✅ admin token ${doc.id.substring(0,30)}... → memberId=${songMemberId}`);
        }
    });
    
    setTimeout(() => process.exit(0), 2000);
}

cleanup().catch(err => { console.error(err); process.exit(1); });

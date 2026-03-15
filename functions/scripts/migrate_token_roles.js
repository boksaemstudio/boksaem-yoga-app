const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function migrateTokenRoles() {
    console.log('=== FCM 토큰 role 필드 마이그레이션 ===\n');
    
    var snap = await db.collection('fcm_tokens').get();
    var batch = db.batch();
    var count = 0;
    
    snap.forEach(function(doc) {
        var data = doc.data();
        // memberId가 있고 role이 없는 토큰 → member로 설정
        if (data.memberId && !data.role) {
            batch.update(doc.ref, { 
                role: 'member',
                platform: data.platform || 'web'
            });
            count++;
            console.log('  수정:', doc.id.substring(0, 12) + '...', '| memberId:', data.memberId, '→ role: member');
        }
    });
    
    if (count > 0) {
        await batch.commit();
        console.log('\n✅ ' + count + '개 토큰의 role을 member로 설정 완료');
    } else {
        console.log('ℹ️ 수정할 토큰이 없습니다.');
    }
    
    // Verify
    console.log('\n=== 마이그레이션 후 확인 ===');
    var snap2 = await db.collection('fcm_tokens').get();
    var stats = {};
    snap2.forEach(function(doc) {
        var role = doc.data().role || 'unknown';
        stats[role] = (stats[role] || 0) + 1;
    });
    for (var role in stats) {
        console.log('  ' + role + ': ' + stats[role] + '개');
    }
    
    process.exit(0);
}

migrateTokenRoles().catch(function(e) { console.error(e); process.exit(1); });

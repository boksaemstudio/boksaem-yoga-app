/**
 * FCM Token Cleanup - 과다 등록 토큰 정리
 * 최신 2개만 남기고 나머지 삭제
 */
const admin = require("firebase-admin");
const path = require("path");

const sa = require(path.join(__dirname, '..', 'service-account-key.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function cleanup() {
    const TARGET_MEMBER = 'b5E5KdDJZGMLQhS6cdIA';
    const COLLECTIONS = ['fcm_tokens', 'fcmTokens', 'push_tokens'];
    let allTokens = [];

    for (const col of COLLECTIONS) {
        try {
            const snap = await db.collection(col).get();
            snap.docs.forEach(doc => {
                const d = doc.data();
                const mid = d.memberId || d.userId || '';
                if (mid === TARGET_MEMBER) {
                    allTokens.push({
                        col, id: doc.id,
                        updatedAt: d.updatedAt || d.createdAt || d.timestamp || null
                    });
                }
            });
        } catch(e) { /* skip */ }
    }

    console.log(`\n🔔 FCM 토큰 정리: ${TARGET_MEMBER}`);
    console.log(`  발견: ${allTokens.length}개`);

    if (allTokens.length <= 2) {
        console.log('  → 정리 불필요 (2개 이하)');
        return;
    }

    // 최신순 정렬
    allTokens.sort((a, b) => {
        const ta = a.updatedAt?.toDate?.() || new Date(0);
        const tb = b.updatedAt?.toDate?.() || new Date(0);
        return tb - ta;
    });

    const keep = allTokens.slice(0, 2);
    const toDelete = allTokens.slice(2);

    console.log(`  유지: ${keep.length}개 (최신)`);
    console.log(`  삭제: ${toDelete.length}개`);

    for (const t of toDelete) {
        await db.collection(t.col).doc(t.id).delete();
        console.log(`    ✅ 삭제: ${t.col}/${t.id}`);
    }

    console.log(`\n✅ 완료! 남은 토큰: ${keep.length}개`);
}

cleanup().then(() => process.exit(0)).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});

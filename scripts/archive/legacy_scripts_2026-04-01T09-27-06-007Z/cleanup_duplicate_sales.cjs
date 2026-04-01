/**
 * 중복 결제 내역 자동 감지 & 정리 스크립트
 * 
 * 동일 memberId + 동일 item + 동일 amount + 5분 이내 생성 → 중복으로 판단
 * 가장 최신 1건만 살리고 나머지는 soft-delete (deletedAt 설정)
 * 
 * 사용법: node scripts/cleanup_duplicate_sales.cjs
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../functions/service-account-key.json'));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const STUDIO_ID = process.argv[2] || 'boksaem-yoga';
const DRY_RUN = process.argv.includes('--dry-run');
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5분 이내 동일 건 = 중복

async function findAndCleanDuplicates() {
    console.log(`\n🔍 [${DRY_RUN ? 'DRY RUN' : 'LIVE'}] Studio: ${STUDIO_ID}\n`);

    const salesRef = db.collection('studios').doc(STUDIO_ID).collection('sales');
    const snap = await salesRef.get();

    // deletedAt이 이미 설정된 건 제외
    const activeSales = snap.docs.filter(d => !d.data().deletedAt);
    console.log(`📊 활성 sales 레코드: ${activeSales.length}건\n`);

    // memberId + item + amount 기준으로 그룹핑
    const groups = {};
    for (const doc of activeSales) {
        const data = doc.data();
        const key = `${data.memberId || 'unknown'}_${data.item || data.itemName || ''}_${data.amount || 0}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ id: doc.id, ref: doc.ref, data });
    }

    let totalDuplicates = 0;
    const duplicateReport = [];

    for (const [key, records] of Object.entries(groups)) {
        if (records.length <= 1) continue;

        // 생성 시간순 정렬
        records.sort((a, b) => {
            const tA = a.data.createdAt || a.data.date || '';
            const tB = b.data.createdAt || b.data.date || '';
            return new Date(tA) - new Date(tB);
        });

        // 시간 간격으로 중복 클러스터 식별
        const clusters = [];
        let currentCluster = [records[0]];

        for (let i = 1; i < records.length; i++) {
            const prevTime = new Date(records[i - 1].data.createdAt || records[i - 1].data.date).getTime();
            const currTime = new Date(records[i].data.createdAt || records[i].data.date).getTime();

            if (Math.abs(currTime - prevTime) < DUPLICATE_WINDOW_MS) {
                currentCluster.push(records[i]);
            } else {
                if (currentCluster.length > 1) clusters.push([...currentCluster]);
                currentCluster = [records[i]];
            }
        }
        if (currentCluster.length > 1) clusters.push(currentCluster);

        for (const cluster of clusters) {
            // 마지막 건(최신)을 살리고 나머지 soft-delete
            const keep = cluster[cluster.length - 1];
            const toDelete = cluster.slice(0, -1);

            duplicateReport.push({
                member: keep.data.memberName || keep.data.memberId,
                item: keep.data.item || keep.data.itemName,
                amount: keep.data.amount,
                total: cluster.length,
                removing: toDelete.length,
                keepId: keep.id
            });

            totalDuplicates += toDelete.length;

            if (!DRY_RUN) {
                const batch = db.batch();
                for (const dup of toDelete) {
                    batch.update(dup.ref, {
                        deletedAt: new Date().toISOString(),
                        deletedReason: 'auto_duplicate_cleanup'
                    });
                }
                await batch.commit();
            }
        }
    }

    // 결과 출력
    console.log('═══════════════════════════════════════════════');
    if (duplicateReport.length === 0) {
        console.log('✅ 중복 결제 내역이 없습니다.');
    } else {
        console.log(`⚠️  ${duplicateReport.length}개 그룹에서 ${totalDuplicates}건의 중복 발견\n`);
        for (const r of duplicateReport) {
            console.log(`  👤 ${r.member} | ${r.item} | ${r.amount?.toLocaleString()}원`);
            console.log(`     ${r.total}건 중 ${r.removing}건 ${DRY_RUN ? '삭제 예정' : '삭제 완료'} (유지: ${r.keepId})`);
        }
    }
    console.log('═══════════════════════════════════════════════');
    console.log(DRY_RUN ? '\n💡 실제 삭제하려면: node scripts/cleanup_duplicate_sales.cjs' : '\n✅ 정리 완료');
}

findAndCleanDuplicates()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });

const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    const doc = await db.collection('studios').doc('boksaem-yoga').get();
    const d = doc.data();
    const legend = d.SCHEDULE_LEGEND || [];
    
    console.log('=== Firestore SCHEDULE_LEGEND (범례) ===');
    legend.forEach((l, i) => {
        console.log(`${i+1}. [${l.label}] color=${l.color} | border=${l.border} | branches=${JSON.stringify(l.branches)}`);
    });

    console.log('\n=== getTagColor 코드 매핑 ===');
    console.log('하타/hatha   → bg: rgba(59,130,246,0.15)  text: #60A5FA  border: rgba(59,130,246,0.3)');
    console.log('빈야사/vinyasa → bg: rgba(16,185,129,0.15)  text: #34D399  border: rgba(16,185,129,0.3)');
    console.log('특별/special  → bg: rgba(var(--primary-rgb),0.15)  text: var(--primary-gold)  border: rgba(var(--primary-rgb),0.3)');
    console.log('키즈/kids     → bg: rgba(234,179,8,0.2)  text: #EAB308  border: rgba(234,179,8,0.4)');
    console.log('기본(회색)   → bg: rgba(156,163,175,0.1)  text: #9CA3AF  border: rgba(156,163,175,0.2)');

    console.log('\n=== 불일치 분석 ===');
    legend.forEach(l => {
        const label = l.label;
        if (label.includes('일반')) {
            console.log(`[일반] 범례: ${l.color} ↔ 코드: rgba(156,163,175,0.1) → 범례는 불투명 흰색, 코드는 반투명 회색 → ⚠️ 불일치`);
        } else if (label.includes('심화') || label.includes('플라잉')) {
            console.log(`[${label}] 범례: ${l.color} ↔ 코드: 매칭 키워드 없음(하타/빈야사/특별/키즈에 해당 안됨) → ⚠️ 코드에 미등록`);
        } else if (label.includes('키즈')) {
            console.log(`[키즈] 범례: ${l.color} ↔ 코드: #EAB308 → ${l.color === '#EAB308' ? '✅ 일치' : '⚠️ 불일치'}`);
        } else if (label.includes('임산부')) {
            console.log(`[임산부] 범례: ${l.color} ↔ 코드: 매칭 키워드 없음 → ⚠️ 코드에 미등록`);
        } else if (label.includes('토요하타') || label.includes('별도')) {
            console.log(`[${label}] 범례: ${l.color} ↔ 코드: 하타 매칭(rgba(59,130,246,0.15)) → ⚠️ 색상 불일치 (범례=보라, 코드=파랑)`);
        } else {
            console.log(`[${label}] 범례: ${l.color} ↔ 코드: 매칭 확인 필요`);
        }
    });

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });

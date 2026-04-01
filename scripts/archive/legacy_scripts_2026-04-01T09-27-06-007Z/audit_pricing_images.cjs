const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    try {
        // 1. 쌍문요가 settings 컬렉션 전수 검사
        console.log('════ ssangmun-yoga settings ════');
        const ssSettings = await db.collection('studios/ssangmun-yoga/settings').get();
        if (ssSettings.empty) {
            console.log('  EMPTY - settings 문서 없음');
        } else {
            ssSettings.forEach(d => {
                console.log(`  settings/${d.id}:`, JSON.stringify(d.data()).substring(0, 500));
            });
        }

        // 2. 쌍문요가 PRICING 필드 (루트 문서)
        console.log('\n════ ssangmun-yoga 루트 PRICING 필드 ════');
        const ssDoc = await db.doc('studios/ssangmun-yoga').get();
        const ssData = ssDoc.data();
        if (ssData.PRICING) {
            console.log('  PRICING 존재! keys:', Object.keys(ssData.PRICING));
            console.log('  DATA:', JSON.stringify(ssData.PRICING).substring(0, 500));
        } else {
            console.log('  PRICING 필드 없음');
        }

        // 3. 쌍문요가 vs 데모요가 vs 복샘요가  PRICING_IMAGE 경로 비교
        console.log('\n════ 가격표 이미지 URL 전수 비교 ════');
        const studios = ['boksaem-yoga', 'ssangmun-yoga', 'demo-yoga'];
        for (const sid of studios) {
            const doc = await db.doc(`studios/${sid}`).get();
            if (!doc.exists) { console.log(`  ${sid}: 문서 없음`); continue; }
            const data = doc.data();
            
            // PRICING_IMAGE 필드 직접 검사
            const pricingImage = data.PRICING_IMAGE || data.pricingImage || data.ASSETS?.PRICING_IMAGE;
            console.log(`  ${sid} PRICING_IMAGE:`, pricingImage || '없음');
            
            // settings/pricing 에서 이미지 URL 검사
            const pricingDoc = await db.doc(`studios/${sid}/settings/pricing`).get();
            if (pricingDoc.exists) {
                const pd = pricingDoc.data();
                const findUrls = (obj, path) => {
                    const urls = [];
                    for (const [k, v] of Object.entries(obj || {})) {
                        if (typeof v === 'string' && (v.includes('firebasestorage') || v.includes('http'))) {
                            urls.push(`${path}.${k}: ${v.substring(0, 120)}`);
                        } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v.toDate)) {
                            urls.push(...findUrls(v, `${path}.${k}`));
                        }
                    }
                    return urls;
                };
                const urls = findUrls(pd, 'pricing');
                if (urls.length) urls.forEach(u => console.log(`    ${u}`));
                else console.log(`    (settings/pricing에 이미지 URL 없음 - ${Object.keys(pd).length}개 키)`);
            } else {
                console.log(`    (settings/pricing 문서 없음)`);
            }
        }

        // 4. 관리자앱에서 가격표 탭이 어떤 데이터를 보여주는지 확인
        // AdminDashboard.jsx의 'pricing' 탭 → AdminPriceManager + PriceImageManager
        console.log('\n════ 가격표 이미지 관련 Storage 경로 검사 ════');
        const bucket = admin.storage().bucket();
        
        for (const sid of studios) {
            const [files] = await bucket.getFiles({ prefix: `studios/${sid}/pricing`, maxResults: 10 });
            console.log(`  ${sid}/pricing Storage files: ${files.length}`);
            files.forEach(f => console.log(`    ${f.name}`));
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
    
    process.exit(0);
})();

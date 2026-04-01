const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function deepAudit() {
    const STUDIOS = ['boksaem-yoga', 'ssangmun-yoga', 'demo-yoga'];
    
    for (const sid of STUDIOS) {
        console.log(`\n════════ ${sid} ════════`);
        
        // Studio root document
        const doc = await db.doc(`studios/${sid}`).get();
        if (!doc.exists) { console.log('  (존재하지 않음)'); continue; }
        const d = doc.data();
        
        console.log('  IDENTITY:', JSON.stringify(d.IDENTITY || '없음'));
        console.log('  ASSETS keys:', d.ASSETS ? Object.keys(d.ASSETS) : '없음');
        
        if (d.ASSETS) {
            // Flatten and print all URLs
            const flatUrls = [];
            const flatten = (obj, prefix) => {
                for (const [k, v] of Object.entries(obj)) {
                    if (typeof v === 'string') flatUrls.push(`${prefix}.${k} = ${v}`);
                    else if (v && typeof v === 'object') flatten(v, `${prefix}.${k}`);
                }
            };
            flatten(d.ASSETS, 'ASSETS');
            flatUrls.forEach(u => console.log(`    ${u}`));
        }
        
        // Check all sub-collections for image URLs
        const subcols = ['settings', 'kiosk_notices', 'members', 'attendance'];
        for (const col of subcols) {
            const snap = await db.collection(`studios/${sid}/${col}`).limit(5).get();
            if (snap.empty) continue;
            
            const urls = [];
            snap.forEach(d => {
                const data = d.data();
                const findUrls = (obj, path) => {
                    for (const [k, v] of Object.entries(obj || {})) {
                        if (typeof v === 'string' && v.includes('firebasestorage')) {
                            urls.push({ doc: d.id, path: `${path}.${k}`, url: v.substring(0, 100) });
                        } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v.constructor && v.constructor.name === 'Timestamp')) {
                            findUrls(v, `${path}.${k}`);
                        }
                    }
                };
                findUrls(data, `${col}/${d.id}`);
            });
            
            if (urls.length > 0) {
                console.log(`\n  [${col}] Firebase Storage URLs:`);
                urls.forEach(u => console.log(`    ${u.path}: ${u.url}`));
            }
        }
    }
    
    // Check if ssangmun-yoga has pricing at ALL - including nested pricing image
    console.log('\n\n════════ 쌍문요가 전체 settings 컬렉션 ════════');
    const ssSettings = await db.collection('studios/ssangmun-yoga/settings').get();
    ssSettings.forEach(d => {
        console.log(`  settings/${d.id}:`, JSON.stringify(d.data()).substring(0, 300));
    });
    if (ssSettings.empty) console.log('  (비어있음 - settings 문서 없음)');

    // Check the AdminDashboard config flow - what does ssangmun-yoga see for pricing image?
    console.log('\n\n════════ 가격표 이미지 경로 비교 ════════');
    const bPricing = await db.doc('studios/boksaem-yoga/settings/pricing').get();
    const sPricing = await db.doc('studios/ssangmun-yoga/settings/pricing').get();
    const dPricing = await db.doc('studios/demo-yoga/settings/pricing').get();
    
    console.log('boksaem-yoga pricing exists:', bPricing.exists, bPricing.exists ? `keys: ${Object.keys(bPricing.data())}` : '');
    console.log('ssangmun-yoga pricing exists:', sPricing.exists);
    console.log('demo-yoga pricing exists:', dPricing.exists, dPricing.exists ? `keys: ${Object.keys(dPricing.data())}` : '');

    process.exit(0);
}

deepAudit().catch(e => { console.error(e); process.exit(1); });

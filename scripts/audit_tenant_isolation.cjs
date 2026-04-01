/**
 * 테넌트 격리 전수조사 스크립트
 * 모든 스튜디오 간 데이터/이미지 URL 교차 오염 검사
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const STUDIOS = ['boksaem-yoga', 'ssangmun-yoga', 'demo-yoga'];

async function auditTenantIsolation() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔍 테넌트 격리(Tenant Isolation) 전수 조사');
    console.log('═══════════════════════════════════════════════════════\n');

    const allData = {};

    for (const studioId of STUDIOS) {
        console.log(`\n── ${studioId} ──`);
        const studioRef = db.collection('studios').doc(studioId);
        const studioDoc = await studioRef.get();
        
        if (!studioDoc.exists) {
            console.log(`  ⚠️ studios/${studioId} 문서가 존재하지 않음!`);
            continue;
        }

        const data = studioDoc.data();
        allData[studioId] = { config: data };

        // 1. ASSETS 확인 (로고, 배경, 가격표 이미지 등)
        console.log('\n  [ASSETS]');
        if (data.ASSETS) {
            const printUrls = (obj, prefix = '') => {
                for (const [k, v] of Object.entries(obj)) {
                    if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('/'))) {
                        console.log(`    ${prefix}${k}: ${v.substring(0, 80)}...`);
                    } else if (typeof v === 'object' && v !== null) {
                        printUrls(v, `${prefix}${k}.`);
                    }
                }
            };
            printUrls(data.ASSETS);
        } else {
            console.log('    (없음)');
        }

        // 2. settings/pricing 이미지 URL 확인
        console.log('\n  [settings/pricing]');
        const pricingDoc = await studioRef.collection('settings').doc('pricing').get();
        if (pricingDoc.exists) {
            const pricing = pricingDoc.data();
            allData[studioId].pricing = pricing;
            // 이미지 URL 찾기
            const findImageUrls = (obj, path = '') => {
                const urls = [];
                for (const [k, v] of Object.entries(obj || {})) {
                    if (typeof v === 'string' && (v.includes('firebasestorage') || v.includes('googleapis') || v.startsWith('http'))) {
                        urls.push({ path: `${path}.${k}`, url: v });
                    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                        urls.push(...findImageUrls(v, `${path}.${k}`));
                    }
                }
                return urls;
            };
            const urls = findImageUrls(pricing);
            if (urls.length > 0) {
                urls.forEach(u => console.log(`    ${u.path}: ${u.url.substring(0, 100)}`));
            } else {
                console.log('    (이미지 URL 없음 - 구조 데이터만 존재)');
            }
            console.log(`    카테고리 수: ${Object.keys(pricing).filter(k => k !== '_meta').length}`);
        } else {
            console.log('    (문서 없음)');
        }

        // 3. settings/general 확인
        console.log('\n  [settings/general]');
        const generalDoc = await studioRef.collection('settings').doc('general').get();
        if (generalDoc.exists) {
            const gd = generalDoc.data();
            allData[studioId].general = gd;
            if (gd.pricingImageUrl) console.log(`    pricingImageUrl: ${gd.pricingImageUrl}`);
            if (gd.pricingImage) console.log(`    pricingImage: ${gd.pricingImage}`);
            if (gd.imageUrl) console.log(`    imageUrl: ${gd.imageUrl}`);
            if (!gd.pricingImageUrl && !gd.pricingImage && !gd.imageUrl) {
                console.log('    (가격표 이미지 URL 없음)');
            }
        } else {
            console.log('    (문서 없음)');
        }

        // 4. kiosk_notices 확인 (공지 이미지)
        console.log('\n  [kiosk_notices]');
        const noticesSnap = await studioRef.collection('kiosk_notices').get();
        noticesSnap.forEach(d => {
            const nd = d.data();
            if (nd.imageUrl) console.log(`    ${d.id}: ${nd.imageUrl.substring(0, 100)}`);
        });
        if (noticesSnap.empty) console.log('    (없음)');
    }

    // ═══ 교차 오염 검사 ═══
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('  🚨 교차 오염(Cross-Contamination) 검사');
    console.log('═══════════════════════════════════════════════════════\n');

    let violations = 0;

    // 각 스튜디오의 모든 URL을 수집
    for (const studioId of STUDIOS) {
        const data = allData[studioId];
        if (!data) continue;

        // 다른 스튜디오의 Storage 경로가 포함된 URL 검사
        const otherStudios = STUDIOS.filter(s => s !== studioId);
        
        const checkUrl = (url, context) => {
            for (const other of otherStudios) {
                // Storage 경로에서 다른 스튜디오 ID 감지
                if (url.includes(`studios%2F${other}`) || url.includes(`studios/${other}`)) {
                    console.log(`  🚨 위반! [${studioId}] ${context}`);
                    console.log(`     → ${other}의 Storage 데이터를 참조 중!`);
                    console.log(`     URL: ${url.substring(0, 120)}`);
                    violations++;
                }
            }
        };

        const scanObj = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return;
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'string' && v.includes('firebasestorage')) {
                    checkUrl(v, `${path}.${k}`);
                } else if (typeof v === 'object' && v !== null) {
                    scanObj(v, `${path}.${k}`);
                }
            }
        };

        scanObj(data.config, `studios/${studioId}`);
        scanObj(data.pricing, `studios/${studioId}/settings/pricing`);
        scanObj(data.general, `studios/${studioId}/settings/general`);
    }

    // ═══ 동일 URL 공유 검사 ═══
    console.log('\n── 동일 URL 공유 검사 ──');
    const urlToStudios = {};
    
    const collectUrls = (obj, studioId, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string' && v.startsWith('http')) {
                if (!urlToStudios[v]) urlToStudios[v] = [];
                if (!urlToStudios[v].includes(studioId)) {
                    urlToStudios[v].push(studioId);
                }
            } else if (typeof v === 'object' && v !== null) {
                collectUrls(v, studioId, `${path}.${k}`);
            }
        }
    };

    for (const studioId of STUDIOS) {
        const data = allData[studioId];
        if (!data) continue;
        collectUrls(data.config, studioId);
        collectUrls(data.pricing, studioId);
        collectUrls(data.general, studioId);
    }

    const sharedUrls = Object.entries(urlToStudios).filter(([, studios]) => studios.length > 1);
    if (sharedUrls.length > 0) {
        console.log(`  ⚠️ ${sharedUrls.length}개의 URL이 여러 스튜디오에서 공유됨:`);
        sharedUrls.forEach(([url, studios]) => {
            console.log(`    공유: ${studios.join(' + ')}`);
            console.log(`    URL: ${url.substring(0, 120)}`);
            violations++;
        });
    } else {
        console.log('  ✅ 동일 URL 공유 없음');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    if (violations > 0) {
        console.log(`  🚨 총 ${violations}개의 격리 위반 발견! 즉시 수정 필요!`);
    } else {
        console.log('  ✅ 교차 오염 없음 — 테넌트 격리 정상');
    }
    console.log('═══════════════════════════════════════════════════════');

    process.exit(0);
}

auditTenantIsolation().catch(e => { console.error('❌', e); process.exit(1); });

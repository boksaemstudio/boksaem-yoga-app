/**
 * Firebase Hosting REST API로 사이트 생성
 * firebase-admin에 내장된 google-auth-library 사용 (추가 설치 불필요)
 * 원래 이름과 최대한 가까운 후보 사용
 */
const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
const https = require('https');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
}

const PROJECT_ID = 'boksaem-yoga';

function apiRequest(method, path, body) {
    return new Promise(async (resolve, reject) => {
        const token = await admin.credential.cert(sa).getAccessToken();
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'firebasehosting.googleapis.com',
            path: `/v1beta1/${path}`,
            method,
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json',
            },
        };
        const req = https.request(opts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function tryCreate(siteId, label) {
    console.log(`  시도: ${siteId}...`);
    const res = await apiRequest('POST', `projects/${PROJECT_ID}/sites?siteId=${siteId}`, {});
    if (res.status === 200 || res.status === 201) {
        console.log(`  ✅ ${label}: https://${siteId}.web.app 생성 성공!`);
        return siteId;
    } else if (res.status === 409) {
        console.log(`  ❌ ${siteId} — 이미 다른 곳에서 사용 중`);
        return null;
    } else {
        const msg = res.data?.error?.message || JSON.stringify(res.data).slice(0, 200);
        console.log(`  ❌ ${siteId} — 에러(${res.status}): ${msg}`);
        return null;
    }
}

(async () => {
    console.log('🔍 사이트 생성 시작...\n');

    // 데모앱: 원래 이름에 가까운 순서
    console.log('📦 데모앱:');
    const demoCandidates = ['passflow-demo', 'passflow-demo-yoga', 'passflow-demo-app'];
    let demoSite = null;
    for (const c of demoCandidates) {
        demoSite = await tryCreate(c, '데모앱');
        if (demoSite) break;
    }

    console.log('\n📦 쌍문요가:');
    const ssangmunCandidates = ['ssangmun-yoga', 'ssangmun-yoga-app', 'ssangmun-yoga-studio'];
    let ssangmunSite = null;
    for (const c of ssangmunCandidates) {
        ssangmunSite = await tryCreate(c, '쌍문요가');
        if (ssangmunSite) break;
    }

    console.log('\n═══════════════════════════════════════');
    if (demoSite) console.log(`✅ 데모앱: https://${demoSite}.web.app`);
    else console.log('❌ 데모앱: 모든 후보 실패');
    if (ssangmunSite) console.log(`✅ 쌍문요가: https://${ssangmunSite}.web.app`);
    else console.log('❌ 쌍문요가: 모든 후보 실패');
    console.log('═══════════════════════════════════════');

    require('fs').writeFileSync(
        require('path').join(__dirname, '..', 'scripts', 'site_names.json'),
        JSON.stringify({ demo: demoSite, ssangmun: ssangmunSite }, null, 2)
    );
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

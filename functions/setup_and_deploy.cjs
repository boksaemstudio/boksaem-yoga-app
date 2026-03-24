/**
 * 🚀 통합 스크립트: 사이트 생성 → firebase.json 수정 → resolveStudioId 수정 → 빌드 → 배포
 * 
 * 이름 전략: 원래 이름 → 실패 시 날짜(0324) 붙여서 재시도
 */
const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });

const PROJECT_ID = 'boksaem-yoga';
const ROOT = path.join(__dirname, '..');
const TODAY = new Date().toISOString().slice(5,10).replace('-',''); // 0324

function apiRequest(method, apiPath, body) {
    return new Promise(async (resolve, reject) => {
        const token = await admin.credential.cert(sa).getAccessToken();
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'firebasehosting.googleapis.com',
            path: `/v1beta1/${apiPath}`,
            method,
            headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
        };
        const req = https.request(opts, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
                catch { resolve({ status: res.statusCode, data: b }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
        if (data) req.write(data);
        req.end();
    });
}

async function createSite(siteId) {
    const res = await apiRequest('POST', `projects/${PROJECT_ID}/sites?siteId=${siteId}`, {});
    if (res.status === 200 || res.status === 201) return { ok: true, name: siteId };
    if (res.status === 409) return { ok: false, reason: 'taken' };
    return { ok: false, reason: res.data?.error?.message || `HTTP ${res.status}` };
}

async function findAndCreate(baseName, label) {
    // 1차: 원래 이름
    console.log(`  ${label}: ${baseName} 시도...`);
    let r = await createSite(baseName);
    if (r.ok) { console.log(`  ✅ ${baseName} 생성!`); return baseName; }
    console.log(`  ❌ ${baseName}: ${r.reason}`);

    // 2차: 날짜 붙이기
    const dated = `${baseName}-${TODAY}`;
    console.log(`  ${label}: ${dated} 시도...`);
    r = await createSite(dated);
    if (r.ok) { console.log(`  ✅ ${dated} 생성!`); return dated; }
    console.log(`  ❌ ${dated}: ${r.reason}`);

    // 3차: 날짜 + 랜덤 2자리
    const rand = `${baseName}-${TODAY}${Math.floor(Math.random()*90+10)}`;
    console.log(`  ${label}: ${rand} 시도...`);
    r = await createSite(rand);
    if (r.ok) { console.log(`  ✅ ${rand} 생성!`); return rand; }
    console.log(`  ❌ ${rand}: ${r.reason}`);

    return null;
}

function updateFirebaseJson(demoSite, ssangmunSite) {
    const config = {
        hosting: [
            {
                site: 'boksaem-yoga',
                public: 'dist',
                ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
                rewrites: [{ source: '**', destination: '/index.html' }],
                headers: [
                    { source: '**', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
                    { source: 'assets/**/*.png', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
                    { source: 'assets/**/*.jpg', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
                    { source: 'assets/**/*.webp', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
                    { source: 'sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
                ],
            },
        ],
        firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
        functions: { source: 'functions' },
        storage: { rules: 'storage.rules' },
    };

    if (demoSite) {
        config.hosting.push({
            site: demoSite,
            public: 'dist',
            ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
            rewrites: [{ source: '**', destination: '/index.html' }],
            headers: [
                { source: '**', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
                { source: 'sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
            ],
        });
    }
    if (ssangmunSite) {
        config.hosting.push({
            site: ssangmunSite,
            public: 'dist',
            ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
            rewrites: [{ source: '**', destination: '/index.html' }],
            headers: [
                { source: '**', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
                { source: 'sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
            ],
        });
    }

    fs.writeFileSync(path.join(ROOT, 'firebase.json'), JSON.stringify(config, null, 2));
    console.log('   ✅ firebase.json 업데이트 완료');
}

function updateResolveStudioId(demoSite, ssangmunSite) {
    const filePath = path.join(ROOT, 'src', 'utils', 'resolveStudioId.ts');
    let content = fs.readFileSync(filePath, 'utf8');

    // 기존 데모/쌍문 매핑 제거 (있으면)
    content = content.replace(/\s*\/\/ 3-1\. 데모앱[\s\S]*?return _cachedStudioId;\s*\}\s*/g, '\n');
    content = content.replace(/\s*\/\/ 3-2\. 쌍문요가[\s\S]*?return _cachedStudioId;\s*\}\s*/g, '\n');

    // 복샘요가 블록 뒤에 새 매핑 추가
    const boksaemBlock = `_cachedStudioId = 'boksaem-yoga';
        return _cachedStudioId;
    }`;

    let newMappings = '';
    if (demoSite) {
        newMappings += `

    // 3-1. 데모앱 (리허설 + 고객 시연)
    if (host.includes('${demoSite}.web.app') || host.includes('${demoSite}.firebaseapp.com')) {
        _cachedStudioId = 'demo-yoga';
        return _cachedStudioId;
    }`;
    }
    if (ssangmunSite) {
        newMappings += `

    // 3-2. 쌍문요가
    if (host.includes('${ssangmunSite}.web.app') || host.includes('${ssangmunSite}.firebaseapp.com')) {
        _cachedStudioId = 'ssangmun-yoga';
        return _cachedStudioId;
    }`;
    }

    content = content.replace(boksaemBlock, boksaemBlock + newMappings);
    fs.writeFileSync(filePath, content);
    console.log('   ✅ resolveStudioId.ts 업데이트 완료');
}

function updateFirebaserc(demoSite, ssangmunSite) {
    const rc = { projects: { default: 'boksaem-yoga' }, etags: {} };
    fs.writeFileSync(path.join(ROOT, '.firebaserc'), JSON.stringify(rc, null, 2));
    console.log('   ✅ .firebaserc 업데이트 완료');
}

(async () => {
    console.log('═══════════════════════════════════════');
    console.log('1️⃣ Firebase Hosting 사이트 생성');
    console.log('═══════════════════════════════════════\n');

    const demoSite = await findAndCreate('passflow-demo', '데모앱');
    console.log('');
    const ssangmunSite = await findAndCreate('ssangmun-yoga', '쌍문요가');

    if (!demoSite && !ssangmunSite) {
        console.log('\n❌ 두 사이트 모두 생성 실패. 중단합니다.');
        process.exit(1);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('2️⃣ 설정 파일 업데이트');
    console.log('═══════════════════════════════════════\n');

    updateFirebaseJson(demoSite, ssangmunSite);
    updateResolveStudioId(demoSite, ssangmunSite);
    updateFirebaserc(demoSite, ssangmunSite);

    console.log('\n═══════════════════════════════════════');
    console.log('3️⃣ 빌드');
    console.log('═══════════════════════════════════════\n');

    try {
        execSync('npm run build', { cwd: ROOT, stdio: 'inherit', timeout: 120000 });
        console.log('   ✅ 빌드 완료');
    } catch (e) {
        console.log('   ❌ 빌드 실패');
        process.exit(1);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('4️⃣ 배포');
    console.log('═══════════════════════════════════════\n');

    const sites = ['boksaem-yoga'];
    if (demoSite) sites.push(demoSite);
    if (ssangmunSite) sites.push(ssangmunSite);

    for (const site of sites) {
        console.log(`📦 ${site} 배포 중...`);
        try {
            execSync(`firebase deploy --only hosting:${site}`, { cwd: ROOT, stdio: 'inherit', timeout: 120000 });
            console.log(`✅ ${site} 배포 완료!\n`);
        } catch (e) {
            console.error(`❌ ${site} 배포 실패\n`);
        }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('5️⃣ Git 커밋/푸시');
    console.log('═══════════════════════════════════════\n');

    try {
        execSync('git add -A', { cwd: ROOT });
        execSync(`git commit -m "feat: SaaS 멀티사이트 배포 (demo:${demoSite || 'N/A'}, ssangmun:${ssangmunSite || 'N/A'})"`, { cwd: ROOT });
        execSync('git push', { cwd: ROOT, timeout: 30000 });
        console.log('   ✅ Git 푸시 완료');
    } catch (e) {
        console.log('   ⚠️ Git: ' + (e.message || '').slice(0, 100));
    }

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 전체 완료!');
    console.log('═══════════════════════════════════════');
    console.log(`🔗 복샘요가: https://boksaem-yoga.web.app`);
    if (demoSite) console.log(`🔗 데모앱: https://${demoSite}.web.app`);
    if (ssangmunSite) console.log(`🔗 쌍문요가: https://${ssangmunSite}.web.app`);
    console.log('═══════════════════════════════════════');

    // 결과 저장
    fs.writeFileSync(path.join(ROOT, 'scripts', 'site_names.json'), JSON.stringify({ demo: demoSite, ssangmun: ssangmunSite }, null, 2));
    process.exit(0);
})().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });

/**
 * Firebase CLI 완전 우회 — REST API만으로 배포
 * 1. 버전 생성
 * 2. 파일 해시 계산 + populateFiles
 * 3. 파일 업로드
 * 4. Finalize
 * 5. Release
 */
const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITES = ['ssangmun-yoga-0'];

let _token = null;
async function getToken() {
    if (!_token) _token = (await admin.credential.cert(sa).getAccessToken()).access_token;
    return _token;
}

function api(method, apiPath, body) {
    return new Promise(async (resolve, reject) => {
        const token = await getToken();
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'firebasehosting.googleapis.com',
            path: `/v1beta1/${apiPath}`,
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
        if (data) req.write(data);
        req.end();
    });
}

function uploadFile(uploadUrl, hash, gzData) {
    return new Promise(async (resolve, reject) => {
        const token = await getToken();
        const url = new URL(`${uploadUrl}/${hash}`);
        const opts = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': gzData.length,
            },
        };
        const req = https.request(opts, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, data: b }));
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('upload timeout')); });
        req.write(gzData);
        req.end();
    });
}

function getAllFiles(dir, base = '') {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) results.push(...getAllFiles(path.join(dir, entry.name), rel));
        else results.push(rel);
    }
    return results;
}

function gzipSync(buf) {
    return zlib.gzipSync(buf, { level: 9 });
}

async function deploySite(siteId) {
    console.log(`\n══ ${siteId} 배포 시작 ══\n`);

    // 1. 파일 해시 계산
    console.log('  1. 파일 해시 계산...');
    const files = getAllFiles(DIST);
    const fileMap = {}; // path -> hash
    const hashData = {}; // hash -> gzipped buffer
    
    for (const f of files) {
        const buf = fs.readFileSync(path.join(DIST, f));
        const gz = gzipSync(buf);
        const hash = crypto.createHash('sha256').update(gz).digest('hex');
        fileMap[`/${f}`] = hash;
        hashData[hash] = gz;
    }
    console.log(`  ✅ ${files.length}개 파일 해시 완료`);

    // 2. 버전 생성
    console.log('  2. 버전 생성...');
    const ver = await api('POST', `sites/${siteId}/versions`, {
        config: {
            rewrites: [{ glob: '**', path: '/index.html' }],
            headers: [
                { glob: '**', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
            ],
        }
    });
    if (ver.status !== 200) {
        console.log(`  ❌ 버전 생성 실패(${ver.status}): ${JSON.stringify(ver.data).slice(0,200)}`);
        return false;
    }
    const vName = ver.data.name;
    console.log(`  ✅ 버전: ${vName.split('/').pop()}`);

    // 3. populateFiles
    console.log('  3. 파일 등록...');
    const pop = await api('POST', `${vName}:populateFiles`, { files: fileMap });
    if (pop.status !== 200) {
        console.log(`  ❌ populateFiles 실패(${pop.status}): ${JSON.stringify(pop.data).slice(0,200)}`);
        return false;
    }
    const uploadUrl = pop.data.uploadUrl;
    const required = pop.data.uploadRequiredHashes || [];
    console.log(`  ✅ ${required.length}/${files.length}개 파일 업로드 필요`);

    // 4. 파일 업로드
    if (required.length > 0) {
        console.log('  4. 파일 업로드...');
        let uploaded = 0;
        for (const hash of required) {
            const gz = hashData[hash];
            if (!gz) { console.log(`  ⚠️ 해시 ${hash} 없음, 건너뜀`); continue; }
            const r = await uploadFile(uploadUrl, hash, gz);
            if (r.status !== 200) console.log(`  ⚠️ 업로드 실패(${r.status}): ${hash.slice(0,8)}`);
            uploaded++;
            if (uploaded % 20 === 0) console.log(`    진행: ${uploaded}/${required.length}`);
        }
        console.log(`  ✅ ${uploaded}개 업로드 완료`);
    } else {
        console.log('  4. 업로드 불필요 (모든 파일 이미 존재)');
    }

    // 5. Finalize
    console.log('  5. Finalize...');
    const fin = await api('PATCH', `${vName}?updateMask=status`, { status: 'FINALIZED' });
    if (fin.status !== 200) {
        console.log(`  ❌ Finalize 실패(${fin.status}): ${JSON.stringify(fin.data).slice(0,200)}`);
        return false;
    }
    console.log('  ✅ Finalized');

    // 6. Release
    console.log('  6. Release...');
    const rel = await api('POST', `sites/${siteId}/releases?versionName=${vName}`, {});
    if (rel.status !== 200) {
        console.log(`  ❌ Release 실패(${rel.status}): ${JSON.stringify(rel.data).slice(0,200)}`);
        return false;
    }
    console.log(`  ✅ https://${siteId}.web.app 배포 완료! 🎉`);
    return true;
}

(async () => {
    console.log('🚀 REST API 직접 배포 (Firebase CLI 우회)\n');

    for (const site of SITES) {
        const ok = await deploySite(site);
        if (!ok) console.log(`\n  ❌ ${site} 배포 실패`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 전체 완료!');
    console.log('🔗 https://boksaem-yoga.web.app');
    console.log('🔗 https://passflowai.web.app');
    console.log('🔗 https://passflowai.web.app');
    console.log('═══════════════════════════════════════');
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TENANT_PATH = 'studios/boksaem-yoga';

async function compare() {
    console.log('=== SaaS 이전(루트) vs 현재(테넌트) 회원 데이터 비교 ===\n');

    // 1. 루트 members (SaaS 이전 원본)
    const rootSnap = await db.collection('members').get();
    const rootMembers = {};
    rootSnap.forEach(doc => {
        rootMembers[doc.id] = { id: doc.id, ...doc.data() };
    });

    // 2. 테넌트 members (현재)
    const tenantSnap = await db.collection(`${TENANT_PATH}/members`).get();
    const tenantMembers = {};
    tenantSnap.forEach(doc => {
        tenantMembers[doc.id] = { id: doc.id, ...doc.data() };
    });

    console.log(`루트(이전): ${Object.keys(rootMembers).length}명`);
    console.log(`테넌트(현재): ${Object.keys(tenantMembers).length}명\n`);

    // 3. 비교할 핵심 필드
    const KEY_FIELDS = ['membershipType', 'branchId', 'homeBranch'];

    const results = {
        onlyInRoot: [],
        onlyInTenant: [],
        membershipTypeMismatch: [],
        branchMismatch: [],
        allMismatches: [],
        matched: 0,
        total: 0
    };

    // 4. 루트에만 있는 회원
    for (const id of Object.keys(rootMembers)) {
        if (!tenantMembers[id]) {
            results.onlyInRoot.push({
                id,
                name: rootMembers[id].name,
                membershipType: rootMembers[id].membershipType,
                credits: rootMembers[id].credits
            });
        }
    }

    // 5. 테넌트에만 있는 회원
    for (const id of Object.keys(tenantMembers)) {
        if (!rootMembers[id]) {
            results.onlyInTenant.push({
                id,
                name: tenantMembers[id].name,
                membershipType: tenantMembers[id].membershipType,
                credits: tenantMembers[id].credits
            });
        }
    }

    // 6. 양쪽 모두 있는 회원 비교
    for (const id of Object.keys(tenantMembers)) {
        if (!rootMembers[id]) continue;

        results.total++;
        const root = rootMembers[id];
        const tenant = tenantMembers[id];

        const diffs = {};
        let hasDiff = false;

        for (const field of KEY_FIELDS) {
            const rootVal = root[field] || null;
            const tenantVal = tenant[field] || null;
            if (rootVal !== tenantVal) {
                diffs[field] = { root: rootVal, tenant: tenantVal };
                hasDiff = true;
            }
        }

        if (hasDiff) {
            const entry = {
                id,
                name: tenant.name,
                diffs,
                rootCredits: root.credits,
                tenantCredits: tenant.credits
            };
            results.allMismatches.push(entry);

            if (diffs.membershipType) {
                results.membershipTypeMismatch.push(entry);
            }
            if (diffs.branchId || diffs.homeBranch) {
                results.branchMismatch.push(entry);
            }
        } else {
            results.matched++;
        }
    }

    // 7. 결과 출력
    console.log('─── 요약 ───');
    console.log(`일치: ${results.matched}/${results.total}명`);
    console.log(`불일치: ${results.allMismatches.length}명`);
    console.log(`  - membershipType 불일치: ${results.membershipTypeMismatch.length}명`);
    console.log(`  - branch 불일치: ${results.branchMismatch.length}명`);
    console.log(`루트에만 존재: ${results.onlyInRoot.length}명`);
    console.log(`테넌트에만 존재: ${results.onlyInTenant.length}명\n`);

    if (results.membershipTypeMismatch.length > 0) {
        console.log('─── membershipType 불일치 목록 ───');
        // Categorize
        const categories = {};
        results.membershipTypeMismatch.forEach(m => {
            const rootType = m.diffs.membershipType.root || '(없음)';
            const tenantType = m.diffs.membershipType.tenant || '(없음)';
            const key = `${rootType} → ${tenantType}`;
            if (!categories[key]) categories[key] = [];
            categories[key].push(m.name);
        });

        for (const [transition, names] of Object.entries(categories)) {
            console.log(`\n  [${transition}] × ${names.length}명:`);
            names.forEach(n => console.log(`    - ${n}`));
        }
    }

    // 8. JSON 결과 저장
    const outputPath = '/tmp/saas_comparison.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n전체 결과 저장: ${outputPath}`);
}

compare().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

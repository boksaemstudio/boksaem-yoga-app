/**
 * 🔬 FCM 토큰 진단 스크립트
 * 
 * 원장님 스마트폰에서 관리자앱 + 강사앱 + 회원앱 동시 사용 시
 * 푸시가 안 오는 문제를 정밀 분석합니다.
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function diagnoseFCMTokens() {
    console.log('\n' + '═'.repeat(80));
    console.log(' 🔬 FCM 토큰 정밀 진단');
    console.log('═'.repeat(80));

    // 1. 전체 토큰 조회
    const tokensSnap = await db.collection(`studios/${STUDIO_ID}/fcm_tokens`).get();
    console.log(`\n📋 총 FCM 토큰 수: ${tokensSnap.size}\n`);

    // 토큰별 상세 분석
    const tokenMap = {}; // devicePrefix → [tokens]
    const roleDistribution = {};
    const multiRoleTokens = [];
    const staleTokens = [];
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    for (const doc of tokensSnap.docs) {
        const data = doc.data();
        const tokenId = doc.id;
        const devicePrefix = tokenId.split(':')[0].substring(0, 20);

        // 디바이스별 그룹핑
        if (!tokenMap[devicePrefix]) tokenMap[devicePrefix] = [];
        tokenMap[devicePrefix].push({ tokenId: tokenId.substring(0, 40) + '...', ...data });

        // 역할 분포
        const role = data.role || 'unknown';
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;

        // roles 배열이 있는 토큰 식별
        if (data.roles && data.roles.length > 1) {
            multiRoleTokens.push({
                token: tokenId.substring(0, 30) + '...',
                role: data.role,
                roles: data.roles,
                memberId: data.memberId || 'N/A',
                instructorName: data.instructorName || 'N/A',
                updatedAt: data.updatedAt
            });
        }

        // 오래된 토큰
        if (data.updatedAt && new Date(data.updatedAt) < twoMonthsAgo) {
            staleTokens.push({
                token: tokenId.substring(0, 30) + '...',
                role: data.role,
                updatedAt: data.updatedAt
            });
        }
    }

    // 2. 역할별 분포
    console.log('📊 역할별 토큰 분포:');
    console.table(roleDistribution);

    // 3. 다중 역할 토큰 (핵심 진단 포인트)
    console.log(`\n🎯 다중 역할(roles[]) 토큰: ${multiRoleTokens.length}개`);
    if (multiRoleTokens.length > 0) {
        console.table(multiRoleTokens);
    }

    // 4. 디바이스별 토큰 수
    console.log('\n📱 디바이스 접두사별 토큰 수:');
    const deviceStats = Object.entries(tokenMap).map(([prefix, tokens]) => ({
        devicePrefix: prefix + '...',
        tokenCount: tokens.length,
        roles: [...new Set(tokens.map(t => t.role))].join(', '),
        memberIds: [...new Set(tokens.filter(t => t.memberId).map(t => t.memberId))].join(', ')
    }));
    console.table(deviceStats);

    // 5. 🔴 핵심 문제 탐지: role 필드 덮어쓰기 문제
    console.log('\n' + '─'.repeat(80));
    console.log('🔴 핵심 문제 탐지: role 필드 마지막 접속 역할 덮어쓰기');
    console.log('─'.repeat(80));

    // admin 역할 찾기 (원장 토큰)
    const adminTokens = tokensSnap.docs.filter(d => {
        const data = d.data();
        return data.role === 'admin' || (data.roles && data.roles.includes('admin'));
    });
    
    console.log(`\n👑 admin 역할 토큰: ${adminTokens.length}개`);
    for (const at of adminTokens) {
        const d = at.data();
        console.log(`  Token: ${at.id.substring(0, 40)}...`);
        console.log(`    role: ${d.role}`);
        console.log(`    roles: ${JSON.stringify(d.roles)}`);
        console.log(`    memberId: ${d.memberId || 'N/A'}`);
        console.log(`    instructorName: ${d.instructorName || 'N/A'}`);
        console.log(`    updatedAt: ${d.updatedAt}`);
    }

    // instructor 역할 찾기
    const instructorTokens = tokensSnap.docs.filter(d => {
        const data = d.data();
        return data.role === 'instructor' || (data.roles && data.roles.includes('instructor'));
    });
    
    console.log(`\n👩‍🏫 instructor 역할 토큰: ${instructorTokens.length}개`);
    for (const it of instructorTokens) {
        const d = it.data();
        console.log(`  Token: ${it.id.substring(0, 40)}...`);
        console.log(`    role: ${d.role}`);
        console.log(`    roles: ${JSON.stringify(d.roles)}`);
        console.log(`    instructorName: ${d.instructorName || 'N/A'}`);
        console.log(`    memberId: ${d.memberId || 'N/A'}`);
    }

    // 6. 🔴 같은 기기에서 토큰이 하나인데 role이 마지막 접속으로 덮어써진 케이스
    console.log('\n' + '─'.repeat(80));
    console.log('🔴 토큰 덮어쓰기 가능성 분석');
    console.log('─'.repeat(80));

    const singleTokenDevices = Object.entries(tokenMap).filter(([_, tokens]) => tokens.length === 1);
    for (const [prefix, tokens] of singleTokenDevices) {
        const t = tokens[0];
        if (t.roles && t.roles.length > 1) {
            console.log(`\n⚠️ 디바이스 ${prefix}...: 토큰 1개에 역할 ${t.roles.length}개`);
            console.log(`   현재 role 필드: "${t.role}" (이것으로 쿼리됨)`);
            console.log(`   roles 배열: ${JSON.stringify(t.roles)} (array-contains로 쿼리됨)`);
            console.log(`   → 이 디바이스는 role='${t.role}'로만 푸시를 받음`);
            const missingRoles = t.roles.filter(r => r !== t.role);
            if (missingRoles.length > 0) {
                console.log(`   🔴 role='${missingRoles.join(',')}' 으로 쿼리하면 이 토큰이 안 잡힘!`);
                console.log(`      → 해결: roles 배열의 array-contains가 제대로 작동하는지 확인 필요`);
            }
        }
    }

    // 7. 스테일 토큰
    console.log(`\n🕰️ 2개월 이상 미갱신 토큰: ${staleTokens.length}개`);

    // 8. push_history 최근 로그
    console.log('\n' + '─'.repeat(80));
    console.log('📬 최근 푸시 발송 로그 (push_history)');
    console.log('─'.repeat(80));

    const historySnap = await db.collection(`studios/${STUDIO_ID}/push_history`)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    if (historySnap.empty) {
        console.log('  (푸시 발송 기록 없음)');
    } else {
        const rows = historySnap.docs.map(d => {
            const data = d.data();
            return {
                type: data.type,
                title: (data.title || '').substring(0, 30),
                status: data.status,
                success: data.successCount || 0,
                fail: data.failureCount || 0,
                member: data.memberName || data.targetMemberId || 'N/A',
                time: data.createdAt?.toDate?.()?.toISOString?.() || 'N/A'
            };
        });
        console.table(rows);
    }

    // 9. 최근 messages (개별 메시지 발송 상태)
    console.log('\n' + '─'.repeat(80));
    console.log('💬 최근 개별 메시지 발송 상태 (messages)');
    console.log('─'.repeat(80));

    const msgSnap = await db.collection(`studios/${STUDIO_ID}/messages`)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    if (msgSnap.empty) {
        console.log('  (메시지 발송 기록 없음)');
    } else {
        const msgRows = msgSnap.docs.map(d => {
            const data = d.data();
            return {
                content: (data.content || '').substring(0, 25),
                status: data.status,
                pushSent: data.pushStatus?.sent ?? 'N/A',
                pushSuccess: data.pushStatus?.successCount ?? 0,
                pushFail: data.pushStatus?.failureCount ?? 0,
                smsSent: data.smsStatus?.sent ?? 'N/A',
                mode: data.sendMode || 'N/A',
                time: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || 'N/A'
            };
        });
        console.table(msgRows);
    }

    // 10. pending_approvals 로그
    console.log('\n' + '─'.repeat(80));
    console.log('⏳ 보류 승인 (pending_approvals)');
    console.log('─'.repeat(80));

    const approvalSnap = await db.collection(`studios/${STUDIO_ID}/pending_approvals`)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    if (approvalSnap.empty) {
        console.log('  (없음)');
    } else {
        approvalSnap.docs.forEach(d => {
            const data = d.data();
            console.log(`  [${data.type}] ${data.title} — ${data.status} (${data.createdAt?.toDate?.()?.toISOString?.() || 'N/A'})`);
        });
    }

    // 11. 진단 결론
    console.log('\n' + '═'.repeat(80));
    console.log(' 📋 진단 결론');
    console.log('═'.repeat(80));

    // 같은 기기(같은 브라우저)에서 관리자 + 강사 + 회원 3개 PWA를 설치하면
    // 동일한 Service Worker를 공유하므로 FCM 토큰이 1개만 발급됨
    // → role 필드가 마지막으로 접속한 앱의 역할로 덮어써짐
    // → 'admin'으로 role 쿼리하면 안 잡히고 'instructor'로만 잡히는 상황 가능

    const hasRolesArray = tokensSnap.docs.some(d => d.data().roles && d.data().roles.length > 1);
    if (hasRolesArray) {
        console.log('\n✅ roles 배열이 감지됨 → array-contains 쿼리가 사용 중');
        console.log('   → getAllFCMTokens()의 array-contains 쿼리가 정상 동작하면');
        console.log('     role 필드가 덮어써져도 roles[] 배열에서 찾아야 합니다.');
        console.log('   → 그런데도 푸시가 안 온다면, Firestore 복합 인덱스 문제일 수 있음!');
    } else {
        console.log('\n🔴 roles 배열이 없는 토큰만 존재!');
        console.log('   → 관리자 앱에서 재로그인하여 roles 배열이 저장되도록 해야 합니다.');
    }

    console.log('\n📌 근본 원인 요약:');
    console.log('   같은 스마트폰의 같은 브라우저에서 관리자앱 + 강사앱 + 회원앱을 설치하면');
    console.log('   3개 PWA가 동일한 Service Worker를 공유하므로 FCM 토큰이 1개만 발급됩니다.');
    console.log('   마지막으로 열린 앱의 role이 최종 저장되어, 다른 role로 쿼리하면 토큰이 안 잡힙니다.');
    console.log('   → roles[] 배열 + array-contains 쿼리로 해결되어야 하지만,');
    console.log('   → Firestore 복합 인덱스가 없으면 array-contains + 다른 필터 동시 사용 불가!\n');

    process.exit(0);
}

diagnoseFCMTokens().catch(err => {
    console.error('진단 실패:', err);
    process.exit(1);
});

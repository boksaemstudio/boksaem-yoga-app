/**
 * 광흥창점(boksaem-yoga) 최근 출석 에러 조사 스크립트 v2
 * 인덱스 불필요한 단순 쿼리로 조사
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'boksaem-yoga.firebasestorage.app'
    });
}
const db = admin.firestore();

const STUDIO_ID = 'boksaem-yoga';
const BRANCH_GWANGHEUNG = 'gwangheungchang';

async function investigate() {
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = kstNow.toISOString().split('T')[0];
    
    console.log(`\n🔍 조사 시작: ${STUDIO_ID} / 광흥창점`);
    console.log(`📅 오늘 날짜 (KST): ${today}`);
    console.log(`⏰ 현재 시각 (KST): ${kstNow.toISOString()}`);
    console.log('='.repeat(70));

    // 1. 오늘 광흥창점 전체 출석 기록
    console.log('\n📋 [1] 오늘 광흥창점 출석 기록:');
    const attendanceSnap = await db.collection(`studios/${STUDIO_ID}/attendance`)
        .where('date', '==', today)
        .where('branchId', '==', BRANCH_GWANGHEUNG)
        .get();
    
    const allRecords = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    allRecords.sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
    });
    
    if (allRecords.length === 0) {
        console.log('  → 오늘 출석 기록 없음');
    } else {
        console.log(`  → 총 ${allRecords.length}건`);
        allRecords.forEach(d => {
            const time = d.timestamp ? new Date(d.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) : '?';
            const icon = d.status === 'denied' || d.denialReason ? '❌' : (d.status === 'pending-offline' ? '⏳' : '✅');
            console.log(`  ${icon} ${time} | ${d.memberName || d.memberId} | 상태: ${d.status || 'valid'} | 사유: ${d.denialReason || '-'} | 수업: ${d.className || '-'} | source: ${d.source || '-'}`);
            if (d.denialReason || d.status === 'denied' || d.status === 'error') {
                console.log(`     ⚠️  에러 상세: memberId=${d.memberId}, deletedAt=${d.deletedAt || '-'}`);
            }
        });
    }

    // 2. 오늘 전체 출석 중 에러 기록 (date 필터만 사용)
    console.log('\n\n🚨 [2] 오늘 전체 denied/error 출석 (모든 브랜치):');
    const allTodaySnap = await db.collection(`studios/${STUDIO_ID}/attendance`)
        .where('date', '==', today)
        .get();
    
    const errorRecords = allTodaySnap.docs.filter(doc => {
        const d = doc.data();
        return d.status === 'denied' || d.denialReason || d.status === 'error';
    });
    
    if (errorRecords.length === 0) {
        console.log('  → 에러/거부 출석 없음');
    } else {
        console.log(`  → ${errorRecords.length}건 발견`);
        errorRecords.forEach(doc => {
            const d = doc.data();
            const time = d.timestamp ? new Date(d.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) : '?';
            console.log(`  ❌ ${time} | ${d.memberName || d.memberId} | branch: ${d.branchId} | 사유: ${d.denialReason || d.status} | 수업: ${d.className}`);
        });
    }

    // 3. Pending (오프라인) 출석 확인
    console.log('\n\n⏳ [3] 미처리 오프라인 출석 (pending_attendance):');
    const pendingSnap = await db.collection(`studios/${STUDIO_ID}/pending_attendance`)
        .limit(20)
        .get();
    
    if (pendingSnap.empty) {
        console.log('  → 없음');
    } else {
        const pendingDocs = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        pendingDocs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        console.log(`  → ${pendingDocs.length}건`);
        pendingDocs.forEach(d => {
            console.log(`  ⏳ ${d.timestamp} | ${d.memberId} | branch: ${d.branchId} | status: ${d.status}`);
        });
    }

    // 4. 광흥창점 최근 출석 에러 (오늘 포함 최근)
    console.log('\n\n📝 [4] 광흥창점 회원 중 수강권 문제 있는 회원:');
    const membersSnap = await db.collection(`studios/${STUDIO_ID}/members`)
        .where('branchId', '==', BRANCH_GWANGHEUNG)
        .get();
    
    const problemMembers = membersSnap.docs.filter(doc => {
        const d = doc.data();
        if (d.isDeleted || d.deletedAt) return false;
        const credits = d.credits || 0;
        const endDate = d.endDate;
        const isExpired = endDate && new Date(today) > new Date(endDate);
        return credits <= 0 || isExpired;
    });

    const activeMembers = membersSnap.docs.filter(d => {
        const data = d.data();
        return !data.isDeleted && !data.deletedAt;
    });
    console.log(`  → 활성 ${activeMembers.length}명 중 문제 ${problemMembers.length}명`);
    problemMembers.forEach(doc => {
        const d = doc.data();
        const isExpired = d.endDate && new Date(today) > new Date(d.endDate);
        const hasNoCredits = (d.credits || 0) <= 0;
        let issue = [];
        if (isExpired) issue.push(`만료(${d.endDate})`);
        if (hasNoCredits) issue.push(`잔여 ${d.credits || 0}회`);
        console.log(`  ⚠️  ${d.name} | ${issue.join(', ')} | type: ${d.membershipType || '-'} | lastAttendance: ${d.lastAttendance || '-'}`);
    });

    // 5. 오늘 출석한 회원들의 현재 수강권 상태 확인
    console.log('\n\n🔎 [5] 오늘 출석한 회원들의 현재 수강권 상태:');
    for (const rec of allRecords) {
        if (!rec.memberId) continue;
        try {
            const memberDoc = await db.collection(`studios/${STUDIO_ID}/members`).doc(rec.memberId).get();
            if (memberDoc.exists) {
                const m = memberDoc.data();
                const time = rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) : '?';
                const isExpired = m.endDate && new Date(today) > new Date(m.endDate);
                const hasNoCredits = (m.credits || 0) <= 0;
                const icon = (isExpired || hasNoCredits) ? '⚠️' : '✅';
                console.log(`  ${icon} ${m.name} | 잔여: ${m.credits || 0}회 | 만료: ${m.endDate || '-'} | type: ${m.membershipType || '-'} | 출석시각: ${time}`);
                if (isExpired) console.log(`     ❗ 수강권 만료 상태에서 출석됨`);
                if (hasNoCredits) console.log(`     ❗ 잔여 횟수 0회인 상태`);
            }
        } catch (e) {
            console.log(`  ❓ ${rec.memberName || rec.memberId} - 회원 정보 조회 실패: ${e.message}`);
        }
    }

    // 6. 소스/상태 분포
    console.log('\n\n📊 [6] 분석 요약:');
    const sources = {};
    allRecords.forEach(a => { const src = a.source || 'unknown'; sources[src] = (sources[src] || 0) + 1; });
    console.log('  출석 소스별 분포:', JSON.stringify(sources));
    
    const statuses = {};
    allRecords.forEach(a => { const st = a.status || 'valid'; statuses[st] = (statuses[st] || 0) + 1; });
    console.log('  상태별 분포:', JSON.stringify(statuses));

    console.log('\n' + '='.repeat(70));
    console.log('✅ 조사 완료\n');
}

investigate().then(() => process.exit(0)).catch(e => { console.error('FATAL:', e); process.exit(1); });

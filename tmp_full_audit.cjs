const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantDb = db.doc('studios/boksaem-yoga');

async function fullAudit() {
    console.log('=== 복샘요가 전체 회원 출석 로그 정합성 분석 ===\n');
    console.log(`분석 시작: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

    // 1. 모든 회원 로드
    const membersSnap = await tenantDb.collection('members').get();
    const members = {};
    membersSnap.forEach(doc => {
        members[doc.id] = { id: doc.id, ...doc.data() };
    });
    console.log(`총 회원 수: ${Object.keys(members).length}명\n`);

    // 2. 모든 출석 기록 로드
    const attSnap = await tenantDb.collection('attendance').get();
    const allAttendance = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        if (!d.deletedAt) { // soft-deleted 제외
            allAttendance.push({ docId: doc.id, ...d });
        }
    });
    console.log(`총 출석 기록 수: ${allAttendance.length}건 (soft-deleted 제외)\n`);

    // 3. 회원별 출석 그룹핑
    const attByMember = {};
    for (const att of allAttendance) {
        const mid = att.memberId;
        if (!mid) continue;
        if (!attByMember[mid]) attByMember[mid] = [];
        attByMember[mid].push(att);
    }

    // 4. 정합성 분석
    const issues = [];
    let checkedCount = 0;

    for (const [memberId, memberData] of Object.entries(members)) {
        const logs = attByMember[memberId] || [];
        const validLogs = logs.filter(l => l.status === 'valid' || l.status === 'approved');
        const deniedLogs = logs.filter(l => l.status === 'denied');
        
        const regDate = memberData.regDate || memberData.startDate || '2000-01-01';
        const endDate = memberData.endDate || '9999-12-31';
        
        // 수강기간 내 유효 출석만 필터
        const inPeriodValid = validLogs.filter(l => l.date >= regDate && l.date <= endDate);
        
        const memberIssues = [];

        // 4a. originalCredits 미설정 검사
        if (memberData.originalCredits === undefined || memberData.originalCredits === null) {
            if (memberData.credits !== undefined && memberData.credits < 9999) {
                memberIssues.push(`⚠️ originalCredits 미설정 (현재 credits: ${memberData.credits})`);
            }
        }

        // 4b. 횟수 정합성 (originalCredits가 있는 경우)
        if (memberData.originalCredits && memberData.originalCredits < 9999) {
            const expected = memberData.originalCredits - inPeriodValid.length;
            if (expected !== memberData.credits) {
                const diff = memberData.credits - expected;
                memberIssues.push(`🚨 횟수 불일치! 원래:${memberData.originalCredits} - 출석:${inPeriodValid.length} = 예상:${expected}, 실제:${memberData.credits} (차이: ${diff > 0 ? '+' : ''}${diff})`);
            }
        }

        // 4c. attendanceCount 불일치 검사
        if (memberData.attendanceCount !== undefined) {
            if (memberData.attendanceCount !== validLogs.length) {
                memberIssues.push(`📊 attendanceCount 불일치: DB값=${memberData.attendanceCount}, 실제 유효 출석=${validLogs.length}`);
            }
        }

        // 4d. 같은 날 중복 출석 검사 (같은 수업 + 같은 시간)
        const dateClassMap = {};
        for (const log of validLogs) {
            const key = `${log.date}_${log.classTime}_${log.className}`;
            if (!dateClassMap[key]) dateClassMap[key] = [];
            dateClassMap[key].push(log);
        }
        for (const [key, records] of Object.entries(dateClassMap)) {
            if (records.length > 1) {
                memberIssues.push(`🔁 같은 수업 중복 출석: ${key} (${records.length}건)`);
            }
        }

        // 4e. 만료 후 출석 검사
        if (endDate !== 'TBD' && endDate !== '9999-12-31' && endDate !== 'unlimited') {
            const afterExpiry = validLogs.filter(l => l.date > endDate);
            if (afterExpiry.length > 0) {
                memberIssues.push(`⏰ 만료 후 유효 출석 ${afterExpiry.length}건 (만료: ${endDate})`);
            }
        }

        // 4f. credits가 마이너스인 경우
        if (memberData.credits < 0) {
            memberIssues.push(`❌ credits 음수: ${memberData.credits}`);
        }

        if (memberIssues.length > 0) {
            issues.push({
                name: memberData.name,
                id: memberId,
                type: memberData.membershipType,
                branch: memberData.branchId || memberData.homeBranch,
                credits: memberData.credits,
                originalCredits: memberData.originalCredits,
                totalLogs: logs.length,
                validLogs: validLogs.length,
                issues: memberIssues
            });
        }
        checkedCount++;
    }

    // 5. 결과 출력
    console.log(`=== 분석 완료: ${checkedCount}명 검사 ===\n`);
    
    if (issues.length === 0) {
        console.log('✅ 모든 회원의 출석 로그가 정합합니다!');
    } else {
        console.log(`🚨 문제 발견: ${issues.length}명\n`);
        console.log('='.repeat(80));
        
        // 심각도별 정렬 (횟수 불일치 > 나머지)
        issues.sort((a, b) => {
            const aHasCredit = a.issues.some(i => i.includes('횟수 불일치')) ? 1 : 0;
            const bHasCredit = b.issues.some(i => i.includes('횟수 불일치')) ? 1 : 0;
            return bHasCredit - aHasCredit;
        });

        for (const issue of issues) {
            console.log(`\n👤 ${issue.name} (${issue.branch || '?'}) [${issue.type}]`);
            console.log(`   ID: ${issue.id}`);
            console.log(`   credits: ${issue.credits}, originalCredits: ${issue.originalCredits ?? 'N/A'}, 출석: ${issue.validLogs}건`);
            for (const msg of issue.issues) {
                console.log(`   ${msg}`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
        
        // 요약 통계
        const creditMismatch = issues.filter(i => i.issues.some(m => m.includes('횟수 불일치'))).length;
        const noOriginal = issues.filter(i => i.issues.some(m => m.includes('originalCredits 미설정'))).length;
        const dupes = issues.filter(i => i.issues.some(m => m.includes('중복 출석'))).length;
        const countMismatch = issues.filter(i => i.issues.some(m => m.includes('attendanceCount 불일치'))).length;
        const negative = issues.filter(i => i.issues.some(m => m.includes('음수'))).length;
        
        console.log('\n📊 요약:');
        console.log(`   횟수(credits) 불일치: ${creditMismatch}명`);
        console.log(`   originalCredits 미설정: ${noOriginal}명`);
        console.log(`   attendanceCount 불일치: ${countMismatch}명`);
        console.log(`   같은 수업 중복 출석: ${dupes}명`);
        console.log(`   credits 음수: ${negative}명`);
    }

    console.log('\n=== 전체 분석 완료 ===');
    process.exit(0);
}

fullAudit().catch(e => { console.error(e); process.exit(1); });

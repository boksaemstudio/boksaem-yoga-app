/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Duration 전수 감사 & 자동 보정 스크립트
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 모든 스튜디오의 모든 회원을 검사하여:
 * 1. duration이 없거나 1인데 pricing config에서는 더 큰 months를 가진 회원을 찾고
 * 2. endDate가 잘못 계산된 회원을 식별하고
 * 3. --fix 플래그로 자동 수정
 * 
 * 사용법:
 *   node scripts/audit_fix_duration.cjs              # 감사만 (dry-run)
 *   node scripts/audit_fix_duration.cjs --fix        # 감사 + 수정
 *   node scripts/audit_fix_duration.cjs --studio=ID  # 특정 스튜디오만
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const studioArg = args.find(a => a.startsWith('--studio='));
const targetStudio = studioArg ? studioArg.split('=')[1] : null;

async function auditStudio(studioId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Studio: ${studioId}`);
    console.log('='.repeat(60));

    // 1. Pricing Config 로드
    const pricingSnap = await db.doc(`studios/${studioId}/settings/pricing`).get();
    if (!pricingSnap.exists) {
        console.log('  ⚠️  pricing config 없음 — 건너뜀');
        return { total: 0, issues: 0, fixed: 0 };
    }
    const pricing = pricingSnap.data();

    // 옵션별 months 맵 구축
    const optionMap = {}; // { label: months, credits_count: months }
    Object.entries(pricing).forEach(([key, cat]) => {
        if (key === '_meta' || !cat.options) return;
        cat.options.forEach(opt => {
            if (opt.label) optionMap[`${key}:${opt.label}`] = opt.months || 1;
            if (opt.credits && opt.credits > 1) optionMap[`${key}:credits:${opt.credits}`] = opt.months || 1;
        });
    });

    // 2. 모든 회원 로드
    const membersSnap = await db.collection(`studios/${studioId}/members`).get();
    let issues = 0;
    let fixed = 0;
    const problems = [];

    for (const doc of membersSnap.docs) {
        const m = doc.data();
        if (m.deletedAt || m.role === 'instructor') continue;

        const dur = m.duration || 0;
        const memberType = m.membershipType || '';
        const subject = m.subject || '';
        const totalCredits = (m.credits || 0) + (m.attendanceCount || 0);

        // pricing에서 올바른 months 찾기
        let correctMonths = null;

        // 1차: subject(이용권 이름)으로 매칭
        const cat = pricing[memberType];
        if (cat?.options) {
            let matched = cat.options.find(opt => subject && opt.label && subject.includes(opt.label));
            if (!matched) {
                matched = cat.options.find(opt => opt.credits === totalCredits && opt.type === 'ticket');
            }
            if (matched?.months) correctMonths = matched.months;
        }

        // duration 문제 감지
        if (correctMonths && correctMonths > 1 && dur <= 1) {
            issues++;
            const problem = {
                memberId: doc.id,
                name: m.name,
                phone: m.phone,
                memberType,
                subject,
                currentDuration: dur,
                correctMonths,
                startDate: m.startDate,
                endDate: m.endDate,
                credits: m.credits
            };
            problems.push(problem);
            console.log(`  ❌ ${m.name} (${m.phone}) — duration=${dur} → 올바른 값: ${correctMonths}개월 [${subject}]`);

            // endDate 보정 필요 여부
            if (m.startDate && m.startDate !== 'TBD' && m.endDate && m.endDate !== 'TBD') {
                const start = new Date(m.startDate + 'T00:00:00+09:00');
                const correctEnd = new Date(start);
                correctEnd.setMonth(correctEnd.getMonth() + correctMonths);
                correctEnd.setDate(correctEnd.getDate() - 1);
                const correctEndStr = correctEnd.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                if (m.endDate !== correctEndStr) {
                    console.log(`     📅 endDate도 잘못됨: ${m.endDate} → ${correctEndStr}`);
                    problem.correctEndDate = correctEndStr;
                }
            }

            if (shouldFix) {
                const updates = { duration: correctMonths };
                if (problem.correctEndDate) updates.endDate = problem.correctEndDate;
                await db.doc(`studios/${studioId}/members/${doc.id}`).update(updates);
                console.log(`     ✅ 수정 완료`);
                fixed++;
            }
        }
    }

    console.log(`\n  📊 결과: 전체 ${membersSnap.size}명 중 ${issues}건 문제 발견${shouldFix ? `, ${fixed}건 수정` : ' (dry-run, --fix로 수정)'}`);
    return { total: membersSnap.size, issues, fixed, problems };
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Duration 전수 감사' + (shouldFix ? ' + 자동 수정' : ' (Dry Run)'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let studioIds = [];
    if (targetStudio) {
        studioIds = [targetStudio];
    } else {
        const studiosSnap = await db.collection('studios').get();
        studioIds = studiosSnap.docs.map(d => d.id);
    }

    let totalIssues = 0;
    let totalFixed = 0;
    const allProblems = [];

    for (const sid of studioIds) {
        const result = await auditStudio(sid);
        totalIssues += result.issues;
        totalFixed += result.fixed;
        if (result.problems) allProblems.push(...result.problems.map(p => ({ ...p, studioId: sid })));
    }

    console.log('\n' + '━'.repeat(60));
    console.log(`🏁 전체 결과: ${studioIds.length}개 스튜디오, ${totalIssues}건 문제${shouldFix ? `, ${totalFixed}건 수정` : ''}`);
    if (totalIssues > 0 && !shouldFix) {
        console.log('💡 수정하려면: node scripts/audit_fix_duration.cjs --fix');
    }
    console.log('━'.repeat(60));

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

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
            if (matched) {
                if (matched.type === 'ticket') {
                    correctMonths = matched.months || 3;
                } else {
                    const base = matched.months || 1;
                    // subject에 '(N개월)'이 명시된 경우 dur 무시하고 N개월 적용
                    let explicitMonths = null;
                    if (subject) {
                        const m = subject.match(/\((\d+)개월\)/);
                        if (m) explicitMonths = parseInt(m[1], 10);
                    }
                    correctMonths = explicitMonths || (base * (dur > 0 ? dur : 1));
                }
            }
        }

        // 3. duration 또는 endDate 문제 감지
        const targetMonths = correctMonths || dur; // 우선 올바른 months 기준, 없으면 현재 설정된 duration 사용
        
        let hasDurationIssue = correctMonths && correctMonths > 1 && dur !== correctMonths;
        let hasEndDateIssue = false;
        let correctEndStr = null;

        if (targetMonths > 0 && m.startDate && m.startDate !== 'TBD' && m.endDate && m.endDate !== 'TBD') {
            const startStr = m.startDate.includes('T') ? m.startDate : m.startDate + 'T00:00:00+09:00';
            const start = new Date(startStr);
            const correctEnd = new Date(start);
            correctEnd.setMonth(correctEnd.getMonth() + targetMonths);
            correctEnd.setDate(correctEnd.getDate() - 1);
            correctEndStr = correctEnd.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

            if (m.endDate !== correctEndStr) {
                // 종료일이 5일 이내 차이면 달력/수동조정 오차로 보고 패스할 수도 있지만,
                // 여기서는 14일 이상 차이날 경우에만 명확한 버그로 분류 (월 단위 오류)
                const end = new Date(m.endDate + 'T00:00:00+09:00');
                const diffDays = Math.abs((end - correctEnd) / (1000 * 60 * 60 * 24));
                if (diffDays > 14) {
                    hasEndDateIssue = true;
                }
            }
        }

        if (hasDurationIssue || hasEndDateIssue) {
            issues++;
            const problem = {
                memberId: doc.id,
                name: m.name,
                phone: m.phone,
                memberType,
                subject,
                currentDuration: dur,
                correctMonths: targetMonths,
                startDate: m.startDate,
                currentEndDate: m.endDate,
                correctEndDate: correctEndStr,
                credits: m.credits
            };
            problems.push(problem);
            
            console.log(`\n  ❌ [${m.name} / ${m.phone}] ${subject}`);
            if (hasDurationIssue) console.log(`     - duration 오류: ${dur} → ${targetMonths}개월`);
            if (hasEndDateIssue) console.log(`     - endDate 오류: ${m.endDate} → ${correctEndStr} (차이 큼)`);

            if (shouldFix) {
                const updates = {};
                if (hasDurationIssue) updates.duration = targetMonths;
                if (hasEndDateIssue && correctEndStr) updates.endDate = correctEndStr;
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

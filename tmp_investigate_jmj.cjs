const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantDb = db.doc('studios/boksaem-yoga');
const memberId = 'F0bemqK3qkjBF3dkH83C';

async function deepInvestigate() {
    console.log('=== 주민정 회원 심층 조사 (인덱스 우회) ===\n');

    // 1. 회원 정보
    const memberDoc = await tenantDb.collection('members').doc(memberId).get();
    const m = memberDoc.data();
    console.log('--- 회원 기본 정보 ---');
    console.log(`이름: ${m.name}`);
    console.log(`회원권 타입: ${m.membershipType}`);
    console.log(`현재 잔여횟수 (credits): ${m.credits}`);
    console.log(`원래 횟수 (originalCredits): ${m.originalCredits || 'undefined'}`);
    console.log(`등록일(regDate): ${m.regDate}`);
    console.log(`시작일(startDate): ${m.startDate || 'N/A'}`);
    console.log(`만료일(endDate): ${m.endDate || 'N/A'}`);
    console.log(`지점: ${m.branchId}`);
    console.log(`attendanceCount: ${m.attendanceCount || 'undefined'}`);
    console.log(`status: ${m.status}`);
    console.log('');

    // 2. 모든 출석 기록 조회 (memberId로만 필터)
    const attSnap = await tenantDb.collection('attendance')
        .where('memberId', '==', memberId)
        .get();
    
    console.log(`--- 전체 출석 기록 (${attSnap.size}건) ---`);
    const allAtt = [];
    attSnap.forEach(doc => allAtt.push({ docId: doc.id, ...doc.data() }));
    allAtt.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    
    // 날짜별 그룹
    const byDate = {};
    for (const att of allAtt) {
        const d = att.date || 'unknown';
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(att);
    }
    
    let approvedCount = 0;
    let validCount = 0;
    let totalCount = 0;
    
    for (const [date, records] of Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b))) {
        for (const r of records) {
            totalCount++;
            if (r.status === 'approved') approvedCount++;
            if (r.status === 'valid') validCount++;
            const flag = records.length > 1 ? ' ⚠️ 같은날 다중출석' : '';
            console.log(`  [${r.date} ${r.classTime || ''}] ${r.className || '?'} | 상태: ${r.status} | 차감여부: ${r.creditDeducted ? 'Y' : 'N'}${flag}`);
        }
    }
    
    console.log('');
    console.log(`총 출석: ${totalCount}건, approved: ${approvedCount}건, valid: ${validCount}건`);
    
    // 3. 매출/결제 기록 조회
    console.log('\n--- 결제 기록 ---');
    const salesSnap = await tenantDb.collection('sales')
        .where('memberId', '==', memberId)
        .get();
    
    if (salesSnap.empty) {
        // 이름으로도 시도
        const salesByName = await tenantDb.collection('sales')
            .where('memberName', '==', '주민정')
            .get();
        console.log(`이름 기반 매출: ${salesByName.size}건`);
        salesByName.forEach(doc => {
            const s = doc.data();
            console.log(`  [${s.date}] ${s.itemName || s.item} | 금액: ${s.amount} | credits given: ${s.credits || 'N/A'} | ID: ${doc.id}`);
        });
    } else {
        console.log(`매출: ${salesSnap.size}건`);
        salesSnap.forEach(doc => {
            const s = doc.data();
            console.log(`  [${s.date}] ${s.itemName || s.item} | 금액: ${s.amount} | credits: ${s.credits || 'N/A'} | originalCredits: ${s.originalCredits || 'N/A'} | ID: ${doc.id}`);
        });
    }

    // 4. 오늘 중복 체크
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const todayRecords = byDate[todayStr] || [];
    console.log(`\n--- 오늘(${todayStr}) 출석 상세 ---`);
    console.log(`오늘 출석 건수: ${todayRecords.length}`);
    for (const r of todayRecords) {
        console.log(`  시간: ${r.timestamp}`);
        console.log(`  수업: ${r.className}, classTime: ${r.classTime}`);
        console.log(`  상태: ${r.status}`);
        console.log(`  creditDeducted: ${r.creditDeducted}`);
        console.log(`  docId: ${r.docId}`);
        console.log('');
    }

    // 5. 횟수 정합성 최종 계산
    console.log('--- 횟수 정합성 최종 분석 ---');
    // status가 valid 또는 approved인 것만 차감 대상
    const deductibleCount = allAtt.filter(a => 
        (a.status === 'approved' || a.status === 'valid') && 
        a.date >= (m.regDate || '2000-01-01') &&
        a.date <= (m.endDate || '9999-12-31')
    ).length;
    
    const creditDeductedCount = allAtt.filter(a => a.creditDeducted === true).length;
    
    console.log(`원래 횟수(originalCredits): ${m.originalCredits || '미설정'}`);
    console.log(`현재 잔여횟수(credits): ${m.credits}`);
    console.log(`수강기간 내 유효 출석(approved+valid): ${deductibleCount}`);
    console.log(`creditDeducted=true인 출석: ${creditDeductedCount}`);
    
    if (m.originalCredits) {
        const expected = m.originalCredits - deductibleCount;
        console.log(`\n예상 잔여횟수 = ${m.originalCredits} - ${deductibleCount} = ${expected}`);
        console.log(`실제 잔여횟수 = ${m.credits}`);
        if (expected !== m.credits) {
            console.log(`⚠️⚠️⚠️ 차이 발생! 차이값: ${m.credits - expected}`);
        } else {
            console.log(`✅ 정합성 일치`);
        }
    } else {
        console.log(`\n⚠️ originalCredits가 미설정 상태입니다.`);
        console.log(`creditDeducted 기준으로 계산하면:`);
        console.log(`현재 credits(${m.credits}) + creditDeducted건수(${creditDeductedCount}) = 예상 원래횟수: ${m.credits + creditDeductedCount}`);
    }

    console.log('\n=== 조사 완료 ===');
    process.exit(0);
}

deepInvestigate().catch(e => { console.error(e); process.exit(1); });

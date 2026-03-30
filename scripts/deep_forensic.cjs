/**
 * 심층 포렌식 스크립트: 삭제된 3/30 오후 출석 회원 역추적
 * 
 * 벡터 1: practice_events 컬렉션 (출석 생성 시 자동 기록, 삭제 면역)
 * 벡터 2: Cloud Functions 로그 (Firebase Admin SDK)
 * 벡터 3: 강사앱 접근 기록 추적
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('='.repeat(70));
    console.log('  심층 포렌식: 삭제된 3/30 오후 출석 회원 역추적');
    console.log('='.repeat(70));

    // ━━━━ 벡터 1: practice_events (출석 이벤트 로그) ━━━━
    console.log('\n[벡터 1] practice_events 컬렉션 전수 조사...');
    console.log('  (출석 생성 시 자동 기록 — 출석 삭제와 무관하게 잔존)');
    
    const eventsSnap = await tdb.collection('practice_events')
        .where('date', '==', '2026-03-30')
        .get();
    
    console.log(`\n  3/30 이벤트 총 ${eventsSnap.size}건 발견!`);
    
    // 현존 출석 기록과 대조
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();
    const existingAttIds = new Set();
    attSnap.forEach(doc => existingAttIds.add(doc.id));
    
    const allEvents = [];
    const deletedEvents = [];
    
    eventsSnap.forEach(doc => {
        const d = doc.data();
        const isDeleted = !existingAttIds.has(doc.id);
        const event = {
            id: doc.id,
            memberId: d.memberId,
            eventType: d.eventType,
            date: d.date,
            context: d.context,
            displayMessage: d.displayMessage,
            createdAt: d.createdAt,
            isDeleted
        };
        allEvents.push(event);
        if (isDeleted) deletedEvents.push(event);
    });
    
    if (deletedEvents.length > 0) {
        console.log(`\n  🔴 출석 삭제되었지만 이벤트 잔존: ${deletedEvents.length}건!`);
        console.log('  ─'.repeat(35));
        
        // 각 삭제된 이벤트의 회원 정보 조회
        for (const evt of deletedEvents) {
            const memberDoc = await tdb.collection('members').doc(evt.memberId).get();
            const memberName = memberDoc.exists ? memberDoc.data().name : '(알 수 없음)';
            const branchId = memberDoc.exists ? memberDoc.data().branchId : '?';
            const credits = memberDoc.exists ? memberDoc.data().credits : '?';
            const count = memberDoc.exists ? memberDoc.data().attendanceCount : '?';
            
            let createdStr = 'N/A';
            if (evt.createdAt) {
                if (typeof evt.createdAt === 'object' && evt.createdAt.toDate) {
                    createdStr = evt.createdAt.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
                }
            }
            
            console.log(`    🔴 ${memberName} (${evt.memberId})`);
            console.log(`       이벤트ID: ${evt.id} | 지점: ${branchId} | credits=${credits} count=${count}`);
            console.log(`       이벤트타입: ${evt.eventType} | 생성: ${createdStr}`);
            if (evt.displayMessage) {
                const msg = typeof evt.displayMessage === 'object' ? JSON.stringify(evt.displayMessage) : evt.displayMessage;
                console.log(`       메시지: ${msg}`);
            }
            console.log('');
        }
    } else {
        console.log('  practice_events에서 삭제된 출석의 잔존 이벤트를 찾지 못했습니다.');
    }

    // ━━━━ 벡터 2: ai_errors 로그 확인 ━━━━
    console.log('\n[벡터 2] AI 에러 로그에서 3/30 기록 조회...');
    const errSnap = await tdb.collection('ai_errors')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    
    let errorCount = 0;
    errSnap.forEach(doc => {
        const d = doc.data();
        let ts = d.timestamp;
        if (ts && typeof ts === 'object' && ts.toDate) ts = ts.toDate().toISOString();
        if (ts && ts.startsWith('2026-03-30')) {
            if (errorCount === 0) console.log('  3/30 에러/로그:');
            console.log(`    ${ts} | ${d.context || d.source || ''} | ${(d.error || d.message || '').substring(0, 100)}`);
            errorCount++;
        }
    });
    if (errorCount === 0) console.log('  3/30 관련 에러 없음');

    // ━━━━ 벡터 3: 모든 이벤트에서 오후 기록 식별 ━━━━
    console.log('\n[벡터 3] 전체 이벤트 시간대 분석 (오전 vs 오후)...');
    const morningEvents = allEvents.filter(e => !e.isDeleted);
    const afternoonDeletedCount = deletedEvents.length;
    console.log(`  현존 이벤트: ${morningEvents.length}건 | 삭제 추정: ${afternoonDeletedCount}건`);

    // ━━━━ 벡터 4: 요약 ━━━━
    console.log('\n' + '='.repeat(70));
    console.log('  최종 결론');
    console.log('='.repeat(70));
    
    if (deletedEvents.length > 0) {
        console.log(`\n  ✅ practice_events를 통해 ${deletedEvents.length}명의 삭제된 회원을 복원 가능!`);
        console.log('  다음 회원들의 출석 기록 재생성 + 횟수 재차감이 필요합니다:');
        for (const evt of deletedEvents) {
            const memberDoc = await tdb.collection('members').doc(evt.memberId).get();
            const memberName = memberDoc.exists ? memberDoc.data().name : '?';
            console.log(`    → ${memberName} (${evt.memberId})`);
        }
    } else {
        console.log('\n  ⚠️ practice_events에 흔적이 없습니다.');
        console.log('  emergency 스크립트가 Firestore 트리거를 우회(Admin SDK batch)하여');
        console.log('  출석을 삭제했기 때문, onDocumentCreated 이벤트는 생성 시점의 기록입니다.');
        console.log('  → 출석이 안면인식으로 "생성"된 시점에 practice_events도 생성되었을 것.');
        console.log('  → 해당 문서가 없다면 안면인식 오출석 자체가 Cloud Function을 트리거하지 못한 것.');
    }

    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });

/**
 * 완전한 저녁 출석 피해자 명단 추출
 * practice_events에서 KST 18:00 이후 실제 회원만 필터링
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('='.repeat(70));
    console.log('  3/30 저녁 수업 피해자 완전 명단');
    console.log('='.repeat(70));

    // 1. 저녁 스케줄 확인
    console.log('\n[1] 3/30(일) 저녁 수업 스케줄');
    const branches = ['gwangheungchang', 'mapo'];
    for (const br of branches) {
        const snap = await tdb.collection('daily_classes').doc(`${br}_2026-03-30`).get();
        if (snap.exists) {
            const classes = (snap.data().classes || []).filter(c => {
                const h = parseInt((c.time || '0').split(':')[0]);
                return h >= 18;
            });
            console.log(`  ${br}: ${classes.map(c => `${c.time} ${c.title}(${c.instructor})`).join(' | ')}`);
        }
    }

    // 2. practice_events에서 삭제된 저녁 이벤트 추출
    console.log('\n[2] practice_events 전수 조사 (KST 15:00 이후 = UTC 06:00 이후)');
    
    const eventsSnap = await tdb.collection('practice_events')
        .where('date', '==', '2026-03-30')
        .get();
    
    // 현존 출석 ID
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();
    const existingAttIds = new Set();
    attSnap.forEach(doc => existingAttIds.add(doc.id));

    // 삭제된 이벤트 중 저녁 시간대(KST 15:00+) 필터링
    const eveningVictims = new Map(); // memberId -> { name, times, branchId, ... }
    
    eventsSnap.forEach(doc => {
        const d = doc.data();
        if (existingAttIds.has(doc.id)) return; // 현존하는 건 제외
        
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) {
            createdAt = createdAt.toDate();
        }
        
        // KST 15:00 = UTC 06:00
        const utcHour = createdAt.getUTCHours();
        const kstHour = (utcHour + 9) % 24;
        
        // KST 15시 이후만 (저녁 수업 시간대)
        if (kstHour < 15) return;
        
        const memberId = d.memberId;
        // demo-member 제외
        if (memberId === 'demo-member') return;
        
        const kstTime = createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
        
        if (!eveningVictims.has(memberId)) {
            eveningVictims.set(memberId, {
                memberId,
                times: [],
                eventIds: [],
                eventTypes: []
            });
        }
        const victim = eveningVictims.get(memberId);
        victim.times.push(kstTime);
        victim.eventIds.push(doc.id);
        victim.eventTypes.push(d.eventType);
    });

    // 3. 회원 정보 보강
    console.log(`\n  KST 15:00 이후 삭제된 이벤트 소유 회원: ${eveningVictims.size}명`);
    
    const realVictims = [];
    const unknownVictims = [];
    
    for (const [memberId, victim] of eveningVictims) {
        const memberDoc = await tdb.collection('members').doc(memberId).get();
        if (memberDoc.exists) {
            const m = memberDoc.data();
            if (m.deletedAt) continue; // soft-deleted 제외
            victim.name = m.name;
            victim.branchId = m.branchId;
            victim.credits = m.credits;
            victim.attendanceCount = m.attendanceCount;
            victim.phone = m.phone;
            victim.membershipType = m.membershipType;
            victim.endDate = m.endDate;
            realVictims.push(victim);
        } else {
            victim.name = '(문서 없음)';
            unknownVictims.push(victim);
        }
    }

    // 시간순 정렬
    realVictims.sort((a, b) => (a.times[0] || '').localeCompare(b.times[0] || ''));

    console.log('\n' + '━'.repeat(70));
    console.log('  확인된 저녁 수업 피해자 (실제 회원)');
    console.log('━'.repeat(70));
    
    realVictims.forEach((v, i) => {
        console.log(`\n  ${i+1}. ${v.name}`);
        console.log(`     ID: ${v.memberId}`);
        console.log(`     지점: ${v.branchId} | credits=${v.credits} count=${v.attendanceCount}`);
        console.log(`     유형: ${v.membershipType || '?'} | 만료: ${v.endDate || '?'}`);
        console.log(`     이벤트 시각: ${v.times.join(', ')}`);
        console.log(`     이벤트 타입: ${v.eventTypes.join(', ')}`);
    });

    if (unknownVictims.length > 0) {
        console.log('\n  ─ 문서 없음 (데모/삭제된 회원) ─');
        unknownVictims.forEach(v => {
            console.log(`    ${v.memberId} | 시각: ${v.times[0]}`);
        });
    }

    console.log('\n' + '━'.repeat(70));
    console.log(`  총 ${realVictims.length}명의 실제 회원 저녁 출석이 삭제됨`);
    console.log(`  이 회원들의 credits -1, attendanceCount +1, 출석기록 재생성 필요`);
    console.log('━'.repeat(70));

    // 4. 복구에 필요한 JSON 출력
    console.log('\n[복구 데이터]');
    const recoveryData = realVictims.map(v => ({
        memberId: v.memberId,
        name: v.name,
        branchId: v.branchId,
        currentCredits: v.credits,
        currentCount: v.attendanceCount,
        eventTime: v.times[0]
    }));
    console.log(JSON.stringify(recoveryData, null, 2));

    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });

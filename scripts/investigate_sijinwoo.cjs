const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const STUDIO = 'boksaem-yoga';

async function investigate() {
    console.log('=== 🚨 시진우 회원 출석 오류 긴급 조사 ===\n');

    // 1. 회원 검색
    console.log('[1] 회원 정보 검색...');
    const allMembers = await db.collection(`studios/${STUDIO}/members`).get();
    const matches = allMembers.docs.filter(d => {
        const name = d.data().name || '';
        return name.includes('시진우') || name.includes('진우');
    });

    if (matches.length === 0) {
        console.log('❌ "시진우" 또는 "진우" 포함 회원 없음!');
        console.log('전체 회원 수:', allMembers.size);
        // 전체 이름 리스트 (디버그)
        const names = allMembers.docs.map(d => d.data().name).filter(Boolean).sort();
        console.log('회원 이름 목록 (처음 30명):', names.slice(0, 30));
    } else {
        for (const doc of matches) {
            const data = doc.data();
            console.log('\n━━━ 회원 정보 ━━━');
            console.log('ID:', doc.id);
            console.log('이름:', data.name);
            console.log('전화:', data.phone);
            console.log('상태:', data.status);
            console.log('회원권:', data.membershipType);
            console.log('시작일:', data.startDate);
            console.log('종료일:', data.endDate);
            console.log('잔여횟수:', data.credits);
            console.log('출석수:', data.attendanceCount);
            console.log('지점:', data.branchId);
            console.log('삭제여부:', data.deletedAt ? `삭제됨 (${data.deletedAt})` : '활성');
            console.log('마지막출석:', data.lastAttendance);
            
            // Check expiration
            const today = '2026-03-29';
            if (data.endDate && data.endDate < today) {
                console.log('⚠️  기간 만료! endDate:', data.endDate, '< 오늘:', today);
            }
            if (data.credits !== undefined && data.credits <= 0) {
                console.log('⚠️  잔여횟수 0 이하!');
            }

            // upcoming membership
            if (data.upcomingMembership) {
                console.log('예정 회원권:', JSON.stringify(data.upcomingMembership));
            }

            // 2. 이 회원의 오늘 출석 기록
            console.log('\n━━━ 오늘 출석 기록 ━━━');
            const attSnap = await db.collection(`studios/${STUDIO}/attendance`)
                .where('memberId', '==', doc.id)
                .where('date', '==', today)
                .get();
            
            if (attSnap.empty) {
                console.log('오늘 출석 기록 없음');
            } else {
                attSnap.docs.forEach(a => {
                    const ad = a.data();
                    console.log(`  [${ad.timestamp}] ${ad.className} | 상태: ${ad.status} | 거부사유: ${ad.denialReason || '없음'} | 삭제: ${ad.deletedAt || 'NO'}`);
                });
            }

            // 3. 최근 7일 출석 기록
            console.log('\n━━━ 최근 출석 기록 (최근 7개) ━━━');
            const recentAtt = await db.collection(`studios/${STUDIO}/attendance`)
                .where('memberId', '==', doc.id)
                .orderBy('timestamp', 'desc')
                .limit(7)
                .get();
            
            recentAtt.docs.forEach(a => {
                const ad = a.data();
                const ts = ad.timestamp;
                const tsStr = ts && ts.toDate ? ts.toDate().toISOString() : ts;
                console.log(`  [${ad.date || '?'}] ${tsStr} | ${ad.className} | 상태: ${ad.status} | 거부: ${ad.denialReason || '-'}`);
            });
        }
    }

    // 4. 오늘 denied/failed 기록 전체
    console.log('\n━━━ 오늘 거부/실패 출석 기록 전체 ━━━');
    const todayAtt = await db.collection(`studios/${STUDIO}/attendance`)
        .where('date', '==', '2026-03-29')
        .get();
    
    const deniedRecords = todayAtt.docs.filter(d => {
        const data = d.data();
        return data.status === 'denied' || data.denialReason || data.status === 'failed' || data.attendanceStatus === 'denied';
    });

    if (deniedRecords.length === 0) {
        console.log('오늘 거부/실패 기록 없음 (총 출석:', todayAtt.size, '건)');
    } else {
        deniedRecords.forEach(d => {
            const data = d.data();
            console.log(`  회원: ${data.memberName || data.memberId} | 상태: ${data.status} | 거부사유: ${data.denialReason} | 시각: ${data.timestamp}`);
        });
    }

    // 5. 에러 로그 확인
    console.log('\n━━━ 최근 에러 로그 ━━━');
    try {
        const errSnap = await db.collection(`studios/${STUDIO}/error_logs`)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        if (errSnap.empty) {
            console.log('에러 로그 없음');
        } else {
            errSnap.docs.forEach(d => {
                const data = d.data();
                console.log(`  [${data.timestamp}] ${data.message} | context: ${JSON.stringify(data.context || {}).slice(0, 200)}`);
            });
        }
    } catch(e) {
        console.log('에러 로그 조회 실패:', e.message);
    }

    // 6. pending_attendance 확인
    console.log('\n━━━ 대기중 출석 (pending) ━━━');
    try {
        const pendSnap = await db.collection(`studios/${STUDIO}/pending_attendance`).get();
        if (pendSnap.empty) {
            console.log('대기중 출석 없음');
        } else {
            pendSnap.docs.forEach(d => {
                const data = d.data();
                console.log(`  [${data.date}] ${data.memberName || data.memberId} | 상태: ${data.status} | 수업: ${data.classTitle}`);
            });
        }
    } catch(e) {
        console.log('pending 조회 실패:', e.message);
    }

    console.log('\n=== 조사 완료 ===');
    process.exit(0);
}

investigate().catch(e => { console.error(e); process.exit(1); });

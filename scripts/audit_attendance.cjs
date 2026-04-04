/**
 * 출석 로그 심층 감사 스크립트 v2
 * 어제(2026-04-04) 복샘요가 출석 기록을 전수 조사합니다.
 * (인덱스 없이 실행 가능한 버전)
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../functions/service-account-key.json'));
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();

function toKST(isoStr) {
    if (!isoStr) return { str: 'N/A', hour: -1, min: -1 };
    const ts = new Date(isoStr);
    const kst = new Date(ts.getTime() + 9 * 60 * 60 * 1000);
    const h = kst.getUTCHours();
    const m = kst.getUTCMinutes();
    return { str: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, hour: h, min: m };
}

async function auditAttendance() {
    const targetDate = '2026-04-04';
    const studioId = 'boksaem-yoga';
    
    console.log('='.repeat(80));
    console.log(`🔍 [감사 시작] ${studioId} 스튜디오의 ${targetDate} 출석 기록 전수 조사`);
    console.log('='.repeat(80));
    
    // 1. 복샘요가 출석 기록 전체 조회 (orderBy 없이)
    const attSnap = await db.collection(`studios/${studioId}/attendance`)
        .where('date', '==', targetDate)
        .get();
    
    // timestamp로 수동 정렬
    const allDocs = attSnap.docs
        .map(doc => ({ docId: doc.id, ...doc.data() }))
        .sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta; // 최신순
        });
    
    console.log(`\n📋 총 ${allDocs.length}건의 출석 기록 발견\n`);
    
    const suspiciousRecords = [];
    
    for (const data of allDocs) {
        const kst = toKST(data.timestamp);
        
        console.log(`[${kst.str}] ${(data.memberName || 'N/A').padEnd(8)} | 수업: ${(data.className || 'N/A').padEnd(20)} | 강사: ${(data.instructor || 'N/A').padEnd(12)} | type: ${(data.type || data.source || 'N/A').padEnd(10)} | status: ${(data.status || 'N/A').padEnd(8)} | eventId: ${data.eventId || 'none'} | docId: ${data.docId}`);
        
        // 의심스러운 기록 필터
        const name = data.memberName || '';
        if (name.includes('민지희') || name.includes('홍서빈')) {
            suspiciousRecords.push({ ...data, kstTimeStr: kst.str, reason: '조사 대상 회원' });
        }
        
        // 22시 이후 출석은 모두 의심
        if (kst.hour >= 22) {
            const alreadyAdded = suspiciousRecords.some(r => r.docId === data.docId);
            if (!alreadyAdded) {
                suspiciousRecords.push({ ...data, kstTimeStr: kst.str, reason: '심야 출석' });
            }
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`🚨 [의심 기록 상세 분석] ${suspiciousRecords.length}건`);
    console.log('='.repeat(80));
    
    for (const rec of suspiciousRecords) {
        console.log(`\n--- 의심 기록 (사유: ${rec.reason}) ---`);
        console.log(`  이름: ${rec.memberName}`);
        console.log(`  시간(KST): ${rec.kstTimeStr}`);
        console.log(`  raw timestamp: ${rec.timestamp}`);
        console.log(`  수업: ${rec.className}`);
        console.log(`  강사: ${rec.instructor}`);
        console.log(`  type: ${rec.type || 'N/A'}`);
        console.log(`  source: ${rec.source || 'N/A'}`);
        console.log(`  status: ${rec.status}`);
        console.log(`  eventId: ${rec.eventId || 'none'}`);
        console.log(`  syncMode: ${rec.syncMode || 'none'}`);
        console.log(`  branchId: ${rec.branchId || 'none'}`);
        console.log(`  memberId: ${rec.memberId}`);
        console.log(`  docId: ${rec.docId}`);
        console.log(`  credits: ${rec.credits}`);
        console.log(`  startDate: ${rec.startDate}`);
        console.log(`  endDate: ${rec.endDate}`);
        console.log(`  cumulativeCount: ${rec.cumulativeCount}`);
        console.log(`  regDate: ${rec.regDate}`);
        console.log(`  classTime: ${rec.classTime}`);
        console.log(`  sessionNumber: ${rec.sessionNumber}`);
        console.log(`  denialReason: ${rec.denialReason}`);
        console.log(`  stateChanges: ${JSON.stringify(rec.stateChanges || null)}`);
        
        // 해당 회원이 실제 복샘요가 회원인지 확인
        if (rec.memberId) {
            const memberDoc = await db.doc(`studios/${studioId}/members/${rec.memberId}`).get();
            if (memberDoc.exists) {
                const m = memberDoc.data();
                console.log(`  ✅ 복샘요가 등록 회원: ${m.name} | 전화: ${m.phone} | 상태: ${m.status} | 가입일: ${m.regDate || m.createdAt}`);
                console.log(`     membershipType: ${m.membershipType} | credits: ${m.credits} | lastAtt: ${m.lastAttendance}`);
            } else {
                console.log(`  ❌ 복샘요가에 등록되지 않은 회원 ID!!! memberId: ${rec.memberId}`);
                
                // 다른 스튜디오에 있는지 전체 검색
                const allStudios = await db.collection('studios').listDocuments();
                for (const studioRef of allStudios) {
                    if (studioRef.id === studioId) continue;
                    const otherMember = await studioRef.collection('members').doc(rec.memberId).get();
                    if (otherMember.exists) {
                        const om = otherMember.data();
                        console.log(`  🚨🚨🚨 다른 스튜디오에서 발견!!! 스튜디오: ${studioRef.id} | 이름: ${om.name} | 전화: ${om.phone}`);
                    }
                }
            }
        }
    }
    
    // 2. 쌍문요가 교차 확인
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [교차 감사] ssangmun-yoga 출석 기록');
    console.log('='.repeat(80));
    
    const ssangmunSnap = await db.collection('studios/ssangmun-yoga/attendance')
        .where('date', '==', targetDate)
        .get();
    console.log(`\n쌍문요가 ${targetDate} 출석 기록: ${ssangmunSnap.size}건`);
    
    const ssangmunDocs = ssangmunSnap.docs
        .map(doc => ({ docId: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    
    for (const data of ssangmunDocs) {
        const kst = toKST(data.timestamp);
        console.log(`[${kst.str}] ${(data.memberName || 'N/A').padEnd(8)} | 수업: ${(data.className || 'N/A').padEnd(20)} | type: ${data.type || data.source || 'N/A'} | status: ${data.status || 'N/A'}`);
    }
    
    // 3. 전체 테넌트 목록 + 출석 건수
    console.log('\n' + '='.repeat(80));
    console.log('🏢 [전체 테넌트 목록 + 출석 현황]');
    console.log('='.repeat(80));
    
    const studiosDocs = await db.collection('studios').listDocuments();
    for (const ref of studiosDocs) {
        const snap = await ref.get();
        const data = snap.data() || {};
        const name = data.IDENTITY?.NAME || data.name || ref.id;
        
        const attCount = await ref.collection('attendance')
            .where('date', '==', targetDate)
            .count().get();
        console.log(`  - ${ref.id}: ${name} → ${targetDate} 출석: ${attCount.data().count}건`);
    }
    
    // 4. 민지희/홍서빈 전체 스튜디오 검색
    console.log('\n' + '='.repeat(80));
    console.log('🔐 [민지희/홍서빈 전체 스튜디오 회원 + 출석이력 검색]');
    console.log('='.repeat(80));
    
    for (const studioRef of studiosDocs) {
        const membersSnap = await studioRef.collection('members').get();
        
        for (const mDoc of membersSnap.docs) {
            const m = mDoc.data();
            if (m.name && (m.name.includes('민지희') || m.name.includes('홍서빈'))) {
                console.log(`\n  🔎 [${studioRef.id}] ${m.name} | ID: ${mDoc.id} | 전화: ${m.phone} | 상태: ${m.status}`);
                console.log(`     membershipType: ${m.membershipType} | credits: ${m.credits} | endDate: ${m.endDate}`);
                
                // 이 회원의 최근 출석 기록 (orderBy 대신 수동 정렬)
                const recentAtt = await studioRef.collection('attendance')
                    .where('memberId', '==', mDoc.id)
                    .limit(20)
                    .get();
                
                const sorted = recentAtt.docs
                    .map(d => ({ docId: d.id, ...d.data() }))
                    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
                    .slice(0, 10);
                
                if (sorted.length === 0) {
                    console.log(`     └─ 출석 기록 없음`);
                } else {
                    for (const a of sorted) {
                        const kst = toKST(a.timestamp);
                        console.log(`     └─ [${a.date}] ${kst.str} | ${a.className} | type: ${a.type || a.source || 'N/A'} | status: ${a.status} | docId: ${a.docId}`);
                    }
                }
            }
        }
    }
    
    // 5. common.js tenantDb() 미격리 호출 잔존 여부 (코딩 결과만 요약)
    console.log('\n' + '='.repeat(80));
    console.log('🔒 [common.js tenantDb() 미격리 잔존 - 코드 레벨 확인 요약]');
    console.log('  → getAllFCMTokens, getStudioName, getStudioLogoUrl 등에서');
    console.log('    tenantDb() 호출시 studioId 미전달 → 환경변수 폴백 위험');
    console.log('='.repeat(80));
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 감사 완료');
    console.log('='.repeat(80));
}

auditAttendance().then(() => process.exit(0)).catch(e => {
    console.error('감사 실행 실패:', e);
    process.exit(1);
});

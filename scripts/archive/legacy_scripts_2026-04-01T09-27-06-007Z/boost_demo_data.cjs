/**
 * 🚀 데모앱 데이터 보강 스크립트
 * 
 * 기존 회원 데이터는 유지하면서:
 * 1. 만료된 회원의 endDate를 연장 → 활성 상태로 복원
 * 2. 최근 4주간 출석 로그 대량 추가 (그래프가 인상적으로 보이도록)
 * 3. 최근 3개월 매출 추가 (성장 트렌드로)
 * 4. 홍대점도 활성화
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();
const STUDIO_ID = 'demo-yoga';
const studioRef = db.doc(`studios/${STUDIO_ID}`);

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d, m) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; }

const CLASS_TYPES = ['하타', '빈야사', '아쉬탕가', '파워', '음양', '명상'];
const CLASS_TIMES = ['07:00', '10:00', '12:00', '14:00', '18:30', '19:00', '20:00', '20:30'];
const INSTRUCTORS = ['김서연', '이하은', '박지윤', '최민지', '정수빈'];
const BRANCHES = ['gangnam', 'hongdae'];

const PRICING = {
    'general_1m_8': { label: '일반 월8회(1개월)', price: 130000 },
    'general_1m_12': { label: '일반 월12회(1개월)', price: 160000 },
    'general_1m_unlim': { label: '일반 무제한(1개월)', price: 200000 },
    'general_3m_12': { label: '일반 월12회(3개월)', price: 432000 },
    'general_3m_unlim': { label: '일반 무제한(3개월)', price: 540000 },
    'intensive_1m_8': { label: '심화 월8회(1개월)', price: 170000 },
    'intensive_1m_unlim': { label: '심화 무제한(1개월)', price: 250000 },
};

(async () => {
    console.log('🚀 데모앱 데이터 보강 시작...\n');
    const now = new Date();
    
    // ═══════════════════════════════════════════════
    // STEP 1: 기존 회원 endDate 연장 + remainingCredits 보강
    // ═══════════════════════════════════════════════
    console.log('1️⃣ 기존 회원 활성화 (endDate 연장)...');
    const membersSnap = await studioRef.collection('members').get();
    let activatedCount = 0;
    
    for (let i = 0; i < membersSnap.docs.length; i += 400) {
        const batch = db.batch();
        const chunk = membersSnap.docs.slice(i, i + 400);
        
        chunk.forEach((doc, idx) => {
            const data = doc.data();
            const endDate = new Date(data.endDate);
            
            // 만료/소진 회원 중 70%를 활성화
            if (endDate < now && Math.random() < 0.7) {
                const newEnd = addMonths(now, randInt(1, 3));
                const remainingCredits = data.totalCredits === 999 ? 999 : randInt(3, Math.min(data.totalCredits || 12, 15));
                const lastAtt = addDays(now, -randInt(0, 7)); // 최근 1주 내 출석
                const branch = idx % 3 === 0 ? 'hongdae' : 'gangnam'; // 홍대점도 분산
                
                batch.update(doc.ref, {
                    endDate: fmtDate(newEnd),
                    remainingCredits,
                    lastAttendance: fmtDate(lastAtt),
                    status: 'active',
                    branch,
                });
                activatedCount++;
            }
            // 이미 활성이지만 endDate가 과거인 경우
            else if (data.status === 'active' && endDate < now) {
                batch.update(doc.ref, {
                    endDate: fmtDate(addMonths(now, randInt(1, 4))),
                    lastAttendance: fmtDate(addDays(now, -randInt(0, 3))),
                });
                activatedCount++;
            }
        });
        
        await batch.commit();
    }
    console.log(`   ✅ ${activatedCount}명 활성화 완료\n`);
    
    // ═══════════════════════════════════════════════
    // STEP 2: 최근 4주간 출석 로그 대량 추가
    //   - 하루 평균 15~25건 (양 지점 합산)
    //   - 요일별 패턴: 월수금 많고, 화목 보통, 토 적음
    //   - 시간대별: 오전/저녁 피크
    // ═══════════════════════════════════════════════
    console.log('2️⃣ 최근 4주 출석 로그 생성...');
    const updatedMembers = await studioRef.collection('members').where('status', '==', 'active').get();
    const activeMembers = updatedMembers.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`   활성 회원 수: ${activeMembers.length}명`);
    
    const attendanceLogs = [];
    const dayWeights = { 0: 0, 1: 1.3, 2: 0.9, 3: 1.3, 4: 0.9, 5: 1.4, 6: 0.5 }; // 일월화수목금토
    
    for (let dayOffset = -28; dayOffset <= 0; dayOffset++) {
        const date = addDays(now, dayOffset);
        const dow = date.getDay();
        if (dow === 0) continue; // 일요일 제외
        
        const weight = dayWeights[dow] || 1;
        const baseCount = Math.floor(randInt(14, 24) * weight);
        
        // 해당 날짜에 출석할 회원 샘플링  
        const shuffled = [...activeMembers].sort(() => Math.random() - 0.5);
        const attendees = shuffled.slice(0, Math.min(baseCount, activeMembers.length));
        
        for (const m of attendees) {
            // 시간대 가중치: 오전(10시)/저녁(18:30~20시) 피크
            let time;
            const r = Math.random();
            if (r < 0.15) time = '07:00';
            else if (r < 0.35) time = '10:00';
            else if (r < 0.45) time = '12:00';
            else if (r < 0.55) time = '14:00';
            else if (r < 0.70) time = '18:30';
            else if (r < 0.80) time = '19:00';
            else if (r < 0.92) time = '20:00';
            else time = '20:30';
            
            attendanceLogs.push({
                memberName: m.name,
                memberId: m.phone ? m.phone.replace(/-/g, '').slice(-4) : m.id.slice(-4),
                phone: m.phone || '',
                date: fmtDate(date),
                time,
                classType: randEl(CLASS_TYPES),
                instructor: randEl(INSTRUCTORS),
                branch: m.branch || randEl(BRANCHES),
                checkInMethod: Math.random() < 0.7 ? 'phone' : 'face',
                createdAt: admin.firestore.Timestamp.fromDate(date),
            });
        }
    }
    
    // 로그 배치 저장
    for (let i = 0; i < attendanceLogs.length; i += 400) {
        const batch = db.batch();
        const chunk = attendanceLogs.slice(i, i + 400);
        chunk.forEach(l => {
            batch.set(studioRef.collection('logs').doc(), l);
        });
        await batch.commit();
    }
    console.log(`   ✅ ${attendanceLogs.length}건 출석 로그 추가\n`);
    
    // ═══════════════════════════════════════════════
    // STEP 3: 최근 3개월 매출 추가 (성장 트렌드)
    //   - 1월: 600만, 2월: 700만, 3월(현재): 550만(진행중)
    //   - 신규등록, 재등록, 체험 등 다양한 유형
    // ═══════════════════════════════════════════════
    console.log('3️⃣ 최근 3개월 매출 추가...');
    const salesRecords = [];
    const planKeys = Object.keys(PRICING);
    
    // 1월 매출 (8~10건)
    for (let j = 0; j < randInt(8, 10); j++) {
        const m = randEl(activeMembers);
        const pk = randEl(planKeys);
        const plan = PRICING[pk];
        const saleDate = new Date(2026, 0, randInt(2, 28));
        salesRecords.push({
            memberId: m.phone ? m.phone.replace(/-/g, '').slice(-4) : m.id.slice(-4),
            memberName: m.name,
            amount: plan.price,
            type: Math.random() < 0.4 ? 'new' : 'renewal',
            planLabel: plan.label,
            membershipType: pk.startsWith('intensive') ? 'intensive' : 'general',
            date: fmtDate(saleDate),
            branch: m.branch || 'gangnam',
            createdAt: admin.firestore.Timestamp.fromDate(saleDate),
        });
    }
    
    // 2월 매출 (10~13건, 성장!)
    for (let j = 0; j < randInt(10, 13); j++) {
        const m = randEl(activeMembers);
        const pk = randEl(planKeys);
        const plan = PRICING[pk];
        const saleDate = new Date(2026, 1, randInt(1, 28));
        salesRecords.push({
            memberId: m.phone ? m.phone.replace(/-/g, '').slice(-4) : m.id.slice(-4),
            memberName: m.name,
            amount: plan.price,
            type: Math.random() < 0.3 ? 'new' : 'renewal',
            planLabel: plan.label,
            membershipType: pk.startsWith('intensive') ? 'intensive' : 'general',
            date: fmtDate(saleDate),
            branch: m.branch || 'gangnam',
            createdAt: admin.firestore.Timestamp.fromDate(saleDate),
        });
    }
    
    // 3월 매출 (현재까지 7~10건)
    for (let j = 0; j < randInt(7, 10); j++) {
        const m = randEl(activeMembers);
        const pk = randEl(planKeys);
        const plan = PRICING[pk];
        const saleDate = new Date(2026, 2, randInt(1, 24));
        salesRecords.push({
            memberId: m.phone ? m.phone.replace(/-/g, '').slice(-4) : m.id.slice(-4),
            memberName: m.name,
            amount: plan.price,
            type: Math.random() < 0.35 ? 'new' : 'renewal',
            planLabel: plan.label,
            membershipType: pk.startsWith('intensive') ? 'intensive' : 'general',
            date: fmtDate(saleDate),
            branch: m.branch || 'gangnam',
            createdAt: admin.firestore.Timestamp.fromDate(saleDate),
        });
    }
    
    // 매출 배치 저장
    for (let i = 0; i < salesRecords.length; i += 400) {
        const batch = db.batch();
        const chunk = salesRecords.slice(i, i + 400);
        chunk.forEach(s => {
            batch.set(studioRef.collection('sales').doc(), s);
        });
        await batch.commit();
    }
    const totalRev = salesRecords.reduce((sum, s) => sum + s.amount, 0);
    console.log(`   ✅ ${salesRecords.length}건 매출 추가 (${(totalRev / 10000).toFixed(0)}만원)\n`);
    
    // ═══════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════
    console.log('═══════════════════════════════════════');
    console.log('🎉 데모 데이터 보강 완료!');
    console.log('═══════════════════════════════════════');
    console.log(`👤 활성화된 회원: ${activatedCount}명`);
    console.log(`✅ 추가 출석 로그: ${attendanceLogs.length}건`);
    console.log(`💰 추가 매출: ${salesRecords.length}건 (${(totalRev / 10000).toFixed(0)}만원)`);
    console.log(`🔗 확인: https://passflow-demo.web.app/admin`);
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
})().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

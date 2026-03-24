/**
 * 🎯 PassFlow 데모앱 시뮬레이션 데이터 생성기
 * 
 * 목적: 잠재 고객(원장)에게 앱의 가치를 극대화해서 보여주는 데이터
 * - 60명의 다양한 상태 회원
 * - 12개월 매출 (계절별 변동, 성장 트렌드)
 * - 출석 로그 (요일/시간대 패턴)
 * - 이탈 위험 회원 (AI 분석이 인상적으로 보이도록)
 */
const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();
const STUDIO_ID = 'demo-yoga';
const studioRef = db.doc(`studios/${STUDIO_ID}`);

// ── 한국 이름 생성 ──
const LAST = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','전','홍','유','고','문','양','손','배','백','허','노'];
const FIRST_F = ['지윤','서연','하은','민지','수빈','지은','예은','다현','소영','현정','지혜','유진','은지','미래','수아','하린','시은','채원','보람','나래','은서','서현','예진','민경','지수','도연'];
const FIRST_M = ['민준','서준','도윤','예준','시우','하준','지호','현우','준서','건우','성민','태현','승우','지훈','재원','동현','윤호','정우','민혁','세준'];
const PHONE_PREFIXES = ['010'];

function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPhone() { return `${randEl(PHONE_PREFIXES)}-${randInt(1000,9999)}-${randInt(1000,9999)}`; }
function randDate(start, end) { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); }
function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addMonths(d, m) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; }

// ── 회원 유형별 가격표 ──
const PRICING = {
    'general_1m_8': { label: '일반 월8회(1개월)', price: 130000, credits: 8, months: 1, type: 'general' },
    'general_1m_12': { label: '일반 월12회(1개월)', price: 160000, credits: 12, months: 1, type: 'general' },
    'general_1m_16': { label: '일반 월16회(1개월)', price: 180000, credits: 16, months: 1, type: 'general' },
    'general_1m_unlim': { label: '일반 무제한(1개월)', price: 200000, credits: 999, months: 1, type: 'general' },
    'general_3m_12': { label: '일반 월12회(3개월)', price: 432000, credits: 36, months: 3, type: 'general' },
    'general_3m_unlim': { label: '일반 무제한(3개월)', price: 540000, credits: 999, months: 3, type: 'general' },
    'general_6m_12': { label: '일반 월12회(6개월)', price: 816000, credits: 72, months: 6, type: 'general' },
    'general_6m_unlim': { label: '일반 무제한(6개월)', price: 1020000, credits: 999, months: 6, type: 'general' },
    'intensive_1m_8': { label: '심화 월8회(1개월)', price: 170000, credits: 8, months: 1, type: 'intensive' },
    'intensive_1m_unlim': { label: '심화 무제한(1개월)', price: 250000, credits: 999, months: 1, type: 'intensive' },
    'intensive_3m_unlim': { label: '심화 무제한(3개월)', price: 675000, credits: 999, months: 3, type: 'intensive' },
    'general_1_drop': { label: '일반 1회권', price: 25000, credits: 1, months: 0, type: 'general' },
    'general_10': { label: '일반 10회권', price: 200000, credits: 10, months: 3, type: 'general' },
};

const CLASS_TYPES = ['하타', '빈야사', '아쉬탕가', '파워', '음양', '명상'];
const INSTRUCTORS_LIST = ['김서연', '이하은', '박지윤', '최민지', '정수빈'];

// ── 회원 생성 ──
function generateMembers() {
    const members = [];
    const now = new Date();
    const oneYearAgo = addMonths(now, -12);
    
    // 분포: 활성 30, 만료 12, 잠든(이탈위험) 8, 신규(이번달) 5, 장기고객 5 = 60명
    const profiles = [
        // 🟢 활성 회원 30명 (다양한 회원권)
        ...Array(8).fill({ status: 'active', planKey: 'general_1m_12', regRange: [-6, -1] }),
        ...Array(6).fill({ status: 'active', planKey: 'general_1m_unlim', regRange: [-8, -2] }),
        ...Array(4).fill({ status: 'active', planKey: 'general_3m_12', regRange: [-4, -1] }),
        ...Array(3).fill({ status: 'active', planKey: 'general_3m_unlim', regRange: [-5, -1] }),
        ...Array(3).fill({ status: 'active', planKey: 'intensive_1m_8', regRange: [-3, -1] }),
        ...Array(2).fill({ status: 'active', planKey: 'general_6m_unlim', regRange: [-6, -2] }),
        ...Array(2).fill({ status: 'active', planKey: 'intensive_3m_unlim', regRange: [-4, -1] }),
        ...Array(2).fill({ status: 'active', planKey: 'general_1m_16', regRange: [-3, -1] }),
        // 🔴 만료 회원 12명
        ...Array(5).fill({ status: 'expired', planKey: 'general_1m_12', regRange: [-8, -3] }),
        ...Array(4).fill({ status: 'expired', planKey: 'general_1m_8', regRange: [-10, -4] }),
        ...Array(3).fill({ status: 'expired', planKey: 'general_1_drop', regRange: [-6, -2] }),
        // 🟡 이탈 위험 (잠든) 8명 — AI 분석이 인상적으로 보여야
        ...Array(3).fill({ status: 'dormant_high', planKey: 'general_3m_unlim', regRange: [-5, -2] }),
        ...Array(3).fill({ status: 'dormant_mid', planKey: 'general_1m_unlim', regRange: [-4, -1] }),
        ...Array(2).fill({ status: 'dormant_low', planKey: 'general_1m_12', regRange: [-3, -1] }),
        // 🔵 신규 5명 (이번달)
        ...Array(5).fill({ status: 'new', planKey: 'general_1m_12', regRange: [0, 0] }),
        // 💎 장기 VIP 5명 (재등록 경험 있음)
        ...Array(5).fill({ status: 'vip', planKey: 'general_6m_unlim', regRange: [-11, -8] }),
    ];

    const usedPhones = new Set();
    
    profiles.forEach((prof, i) => {
        const isFemale = Math.random() < 0.75; // 요가원은 여성 비율 높음
        const name = randEl(LAST) + (isFemale ? randEl(FIRST_F) : randEl(FIRST_M));
        let phone;
        do { phone = randPhone(); } while (usedPhones.has(phone));
        usedPhones.add(phone);
        
        const regDate = addMonths(now, randInt(prof.regRange[0], prof.regRange[1]));
        regDate.setDate(randInt(1, 28));
        const plan = PRICING[prof.planKey];
        const endDate = plan.months > 0 ? addMonths(regDate, plan.months) : addMonths(regDate, 3);
        
        // 잔여 크레딧 계산
        let remainingCredits = plan.credits;
        if (prof.status === 'active') remainingCredits = randInt(1, Math.min(plan.credits, 15));
        if (prof.status === 'expired') remainingCredits = 0;
        if (prof.status === 'new') remainingCredits = randInt(plan.credits - 3, plan.credits);
        if (prof.status === 'vip') remainingCredits = randInt(5, 20);
        if (prof.status.startsWith('dormant')) remainingCredits = randInt(2, 8);
        
        // 마지막 출석일
        let lastAttendance;
        if (prof.status === 'active') lastAttendance = randDate(addMonths(now, 0), now);
        else if (prof.status === 'new') lastAttendance = randDate(addMonths(now, 0), now);
        else if (prof.status === 'expired') lastAttendance = randDate(addMonths(now, -4), addMonths(now, -1));
        else if (prof.status === 'dormant_high') lastAttendance = randDate(addMonths(now, -2), addMonths(now, -1));
        else if (prof.status === 'dormant_mid') lastAttendance = randDate(addMonths(now, -1), addMonths(now, 0));
        else if (prof.status === 'dormant_low') lastAttendance = randDate(addMonths(now, 0), now);
        else if (prof.status === 'vip') lastAttendance = randDate(addMonths(now, 0), now);
        
        const member = {
            name,
            phone,
            regDate: fmtDate(regDate),
            endDate: fmtDate(endDate > now && (prof.status === 'active' || prof.status === 'new' || prof.status === 'vip' || prof.status.startsWith('dormant')) ? endDate : addMonths(endDate, -1)),
            membershipType: plan.type,
            totalCredits: plan.credits === 999 ? 999 : plan.credits,
            remainingCredits: plan.credits === 999 ? 999 : remainingCredits,
            lastAttendance: fmtDate(lastAttendance),
            branch: 'gangnam',
            status: prof.status.startsWith('dormant') ? 'active' : prof.status === 'vip' ? 'active' : prof.status,
            price: plan.price,
            planLabel: plan.label,
            createdAt: admin.firestore.Timestamp.fromDate(regDate),
        };
        
        members.push(member);
    });
    
    return members;
}

// ── 매출 기록 생성 (12개월, 계절별 변동) ──
function generateSales(members) {
    const sales = [];
    const now = new Date();
    
    // 월별 매출 가중치 (1월 높음, 7-8월 낮음, 9월 반등)
    const monthWeights = { 0: 1.3, 1: 1.2, 2: 1.15, 3: 1.1, 4: 1.0, 5: 0.9, 6: 0.7, 7: 0.65, 8: 1.1, 9: 1.2, 10: 1.1, 11: 1.0 };
    
    members.forEach(m => {
        const regDate = new Date(m.regDate);
        const plan = Object.values(PRICING).find(p => p.label === m.planLabel) || PRICING.general_1m_12;
        
        // 초기 등록 매출
        sales.push({
            memberId: m.phone.replace(/-/g, '').slice(-4),
            memberName: m.name,
            amount: plan.price,
            type: 'new',
            planLabel: plan.label,
            membershipType: plan.type,
            date: fmtDate(regDate),
            branch: m.branch,
            createdAt: admin.firestore.Timestamp.fromDate(regDate),
        });
        
        // VIP/장기 회원은 재등록 매출 추가 (최대 3회)
        if (m.status === 'active' && Math.random() < 0.4) {
            const renewDate = addMonths(regDate, plan.months || 1);
            if (renewDate < now) {
                sales.push({
                    memberId: m.phone.replace(/-/g, '').slice(-4),
                    memberName: m.name,
                    amount: plan.price,
                    type: 'renewal',
                    planLabel: plan.label,
                    membershipType: plan.type,
                    date: fmtDate(renewDate),
                    branch: m.branch,
                    createdAt: admin.firestore.Timestamp.fromDate(renewDate),
                });
            }
        }
    });
    
    return sales;
}

// ── 출석 로그 생성 (12개월, 패턴 기반) ──
function generateAttendanceLogs(members) {
    const logs = [];
    const now = new Date();
    const CLASS_TIMES = ['10:00', '12:00', '14:00', '18:30', '20:00'];
    
    members.forEach(m => {
        if (m.status === 'expired' && Math.random() < 0.3) return; // 만료 회원 중 일부만 로그
        
        const regDate = new Date(m.regDate);
        const endDate = new Date(m.endDate);
        const actualEnd = endDate > now ? now : endDate;
        
        // 주당 출석 횟수 (활성: 2~4, 잠든: 0~1, 신규: 1~3)
        let weeklyRate;
        if (m.status === 'active') weeklyRate = randInt(2, 4);
        else if (m.status === 'new') weeklyRate = randInt(1, 3);
        else if (m.status === 'expired') weeklyRate = randInt(1, 2);
        else weeklyRate = randInt(0, 1);
        
        // 출석 패턴 생성
        const daysBetween = Math.floor((actualEnd.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalSessions = Math.floor((daysBetween / 7) * weeklyRate);
        
        for (let s = 0; s < Math.min(totalSessions, 80); s++) {
            const logDate = randDate(regDate, actualEnd);
            const dayOfWeek = logDate.getDay();
            if (dayOfWeek === 0) continue; // 일요일 제외
            
            const time = randEl(CLASS_TIMES);
            const classType = randEl(CLASS_TYPES);
            const instructor = randEl(INSTRUCTORS_LIST);
            
            logs.push({
                memberName: m.name,
                memberId: m.phone.replace(/-/g, '').slice(-4),
                phone: m.phone,
                date: fmtDate(logDate),
                time,
                classType,
                instructor,
                branch: m.branch,
                checkInMethod: Math.random() < 0.7 ? 'phone' : 'face',
                createdAt: admin.firestore.Timestamp.fromDate(logDate),
            });
        }
    });
    
    return logs;
}

// ── 스튜디오 설정 문서 ──
const DEMO_CONFIG = {
    IDENTITY: {
        NAME: "패스플로우 데모 요가",
        NAME_ENGLISH: "PassFlow Demo Yoga",
        LOGO_TEXT: "PASSFLOW",
        SLOGAN: "요가원 통합 관리 시스템",
        DESCRIPTION: "출석·매출·회원 관리를 한 곳에서",
        APP_VERSION: "2026.03.24",
    },
    POLICIES: {
        DORMANT_THRESHOLD_DAYS: 14,
        EXPIRING_THRESHOLD_DAYS: 7,
        CHECKIN_TIMEOUT_MS: 10000,
        SESSION_AUTO_CLOSE_SEC: 25,
        ALLOW_SELF_HOLD: false,
        HOLD_RULES: [
            { durationMonths: 3, maxCount: 1, maxWeeks: 2 },
            { durationMonths: 6, maxCount: 2, maxWeeks: 4 }
        ],
        ALLOW_BOOKING: false,
        CREDIT_RULES: { mode: 'total', weeklyResetDay: 1, allowCarryOver: false, weeklyLimitSource: 'plan' },
        SHOW_CAMERA_PREVIEW: false,
        FACE_RECOGNITION_ENABLED: false,
    },
    ASSETS: {
        LOGO: {
            WIDE: '/assets/logo_wide.webp',
            SQUARE: '/assets/logo_square.webp',
            RYS200: '/assets/RYS200.webp',
        },
        MEMBER_BG: '/assets/default_member_bg.webp',
        BACKGROUNDS: {
            MORNING: '/assets/bg_morning.webp',
            AFTERNOON: '/assets/bg_afternoon.webp',
            EVENING: '/assets/bg_evening.webp',
            NIGHT: '/assets/bg_night.webp'
        }
    },
    SCHEDULE_LEGEND: [
        { label: '하타', color: '#FFFFFF', border: '#DDDDDD' },
        { label: '빈야사', color: '#E8F5E9', border: '#66BB6A' },
        { label: '아쉬탕가', color: '#FFF9C4', border: '#F9A825' },
        { label: '파워', color: '#FFE0B2', border: '#FF9800' },
        { label: '음양', color: '#E3F2FD', border: '#42A5F5' },
        { label: '명상', color: '#F3E5F5', border: '#AB47BC' },
    ],
    MEMBERSHIP_TYPE_MAP: {
        'general': '일반',
        'intensive': '심화',
    },
    AI_CONFIG: {
        NAME: "AI 코치",
        PERSONALITY: "Guide",
        TONE: "Traditional & Warm",
        KEYWORDS: ["나마스테", "프라나", "타파스", "사티"],
        ENABLE_ENHANCED_MESSAGES: true,
        FALLBACK_QUOTES: [
            "오늘도 매트 위에서 나를 만나는 소중한 시간입니다.",
            "호흡을 통해 마음의 평온을 찾으세요.",
            "꾸준한 수련이 최고의 선물입니다.",
        ]
    },
    BRANCHES: [
        { id: 'gangnam', name: '강남점', color: '#D4AF37' },
        { id: 'hongdae', name: '홍대점', color: '#3B82F6' },
    ],
    THEME: {
        PRIMARY_COLOR: "#D4AF37",
        ACCENT_COLOR: "#3B82F6",
        SKELETON_COLOR: "rgba(212, 175, 55, 0.1)",
    },
    FEATURES: {
        ENABLE_DATA_MIGRATION: false,
    },
    INSTRUCTORS: INSTRUCTORS_LIST.map((n, i) => ({ id: `inst-${i}`, name: n })),
    SOCIAL: {},
    DEFAULT_SCHEDULE_TEMPLATE: {},
};

// ── MAIN ──
(async () => {
    console.log('🎯 PassFlow 데모 데이터 생성 시작...\n');
    
    // 1. 스튜디오 설정 저장
    console.log('1️⃣ 스튜디오 설정 저장...');
    await studioRef.set(DEMO_CONFIG);
    console.log('   ✅ studios/demo-yoga 문서 생성 완료\n');
    
    // 2. 회원 생성
    console.log('2️⃣ 회원 60명 생성...');
    const members = generateMembers();
    const memberBatch = db.batch();
    const membersRef = studioRef.collection('members');
    members.forEach(m => {
        const docRef = membersRef.doc(); // auto-id
        memberBatch.set(docRef, m);
    });
    await memberBatch.commit();
    console.log(`   ✅ ${members.length}명 생성 완료`);
    console.log(`   - 활성: ${members.filter(m => m.status === 'active').length}명`);
    console.log(`   - 만료: ${members.filter(m => m.status === 'expired').length}명`);
    console.log(`   - 신규: ${members.filter(m => m.status === 'new').length}명\n`);
    
    // 3. 매출 기록 생성
    console.log('3️⃣ 매출 기록 생성...');
    const sales = generateSales(members);
    // Firestore batch limit is 500, split if needed
    for (let i = 0; i < sales.length; i += 400) {
        const batch = db.batch();
        const chunk = sales.slice(i, i + 400);
        chunk.forEach(s => {
            const docRef = studioRef.collection('sales').doc();
            batch.set(docRef, s);
        });
        await batch.commit();
    }
    const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
    console.log(`   ✅ ${sales.length}건 생성 (총 매출: ${(totalRevenue / 10000).toFixed(0)}만원)\n`);
    
    // 4. 출석 로그 생성
    console.log('4️⃣ 출석 로그 생성...');
    const logs = generateAttendanceLogs(members);
    for (let i = 0; i < logs.length; i += 400) {
        const batch = db.batch();
        const chunk = logs.slice(i, i + 400);
        chunk.forEach(l => {
            const docRef = studioRef.collection('logs').doc();
            batch.set(docRef, l);
        });
        await batch.commit();
    }
    console.log(`   ✅ ${logs.length}건 생성\n`);
    
    // 5. 요약
    console.log('═══════════════════════════════════════');
    console.log('🎉 데모 데이터 생성 완료!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 회원: ${members.length}명`);
    console.log(`💰 매출: ${sales.length}건 (${(totalRevenue / 10000).toFixed(0)}만원)`);
    console.log(`✅ 출석: ${logs.length}건`);
    console.log(`🔗 접속: https://passflow-demo.web.app`);
    console.log(`🔗 로컬: http://localhost:5173/?studio=demo-yoga`);
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
})().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
